//! WASM-based SVG parsing and tessellation using Lyon.
//!
//! Parses SVG content and tessellates paths into triangle meshes
//! for GPU rendering in Glade.

use lyon::math::Point;
use lyon::tessellation::{
    BuffersBuilder, FillOptions, FillTessellator, FillVertex, FillVertexConstructor, StrokeOptions,
    StrokeTessellator, StrokeVertex, StrokeVertexConstructor, VertexBuffers,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// A vertex with position and edge distance for antialiasing.
#[derive(Clone, Debug)]
pub struct TessVertex {
    pub x: f32,
    pub y: f32,
    /// Edge distance: 0.0 = on boundary, 1.0 = interior
    pub edge_dist: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TessellatedMesh {
    /// Flat array of vertex data: [x, y, edge_dist, x, y, edge_dist, ...]
    pub vertices: Vec<f32>,
    pub indices: Vec<u32>,
    pub bounds: MeshBounds,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct MeshBounds {
    pub min_x: f32,
    pub min_y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

impl MeshBounds {
    fn expand(&mut self, x: f32, y: f32) {
        self.min_x = self.min_x.min(x);
        self.min_y = self.min_y.min(y);
        self.max_x = self.max_x.max(x);
        self.max_y = self.max_y.max(y);
    }

    fn new() -> Self {
        Self {
            min_x: f32::MAX,
            min_y: f32::MAX,
            max_x: f32::MIN,
            max_y: f32::MIN,
        }
    }

    fn is_valid(&self) -> bool {
        self.min_x <= self.max_x && self.min_y <= self.max_y
    }
}

/// Vertex constructor that extracts position and edge distance for AA.
///
/// Note: Lyon's fill tessellator doesn't provide per-vertex edge information
/// that we can use for AA. For proper edge-based AA, we'd need to either:
/// 1. Use a post-processing pass to compute edge distances per-triangle
/// 2. Use MSAA at the render target level
/// 3. Generate an "AA fringe" around the path outline
///
/// For now, we set edge_dist = 1.0 for all vertices (fully opaque interior).
struct VertexWithEdge;

impl FillVertexConstructor<TessVertex> for VertexWithEdge {
    fn new_vertex(&mut self, vertex: FillVertex) -> TessVertex {
        let pos = vertex.position();
        TessVertex {
            x: pos.x,
            y: pos.y,
            // All fill vertices are treated as interior (opaque)
            // AA will be handled via other mechanisms (MSAA or fringe)
            edge_dist: 1.0,
        }
    }
}

impl StrokeVertexConstructor<TessVertex> for VertexWithEdge {
    fn new_vertex(&mut self, vertex: StrokeVertex) -> TessVertex {
        let pos = vertex.position();
        // For strokes, we could use the side (-1 or 1) to identify edges,
        // but for now keep all opaque
        TessVertex {
            x: pos.x,
            y: pos.y,
            edge_dist: 1.0,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ParsedPath {
    pub fill: Option<String>,
    pub stroke: Option<String>,
    pub stroke_width: Option<f32>,
    pub d: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ParsedSvg {
    pub width: f32,
    pub height: f32,
    pub view_box: Option<ViewBox>,
    pub paths: Vec<ParsedPath>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ViewBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[wasm_bindgen]
pub struct SvgTessellator {
    fill_tessellator: FillTessellator,
    stroke_tessellator: StrokeTessellator,
}

#[wasm_bindgen]
impl SvgTessellator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            fill_tessellator: FillTessellator::new(),
            stroke_tessellator: StrokeTessellator::new(),
        }
    }

    #[wasm_bindgen]
    pub fn parse_svg(&self, svg_content: &str) -> Result<JsValue, JsValue> {
        let parsed = parse_svg_content(svg_content);
        serde_wasm_bindgen::to_value(&parsed)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    #[wasm_bindgen]
    pub fn tessellate_path(
        &mut self,
        path_d: &str,
        offset_x: f32,
        offset_y: f32,
        scale_x: f32,
        scale_y: f32,
    ) -> Result<JsValue, JsValue> {
        let commands = parse_svg_path_d(path_d);
        let path = build_lyon_path(&commands, offset_x, offset_y, scale_x, scale_y);

        let mut buffers: VertexBuffers<TessVertex, u32> = VertexBuffers::new();

        self.fill_tessellator
            .tessellate_path(
                &path,
                &FillOptions::default().with_tolerance(0.1),
                &mut BuffersBuilder::new(&mut buffers, VertexWithEdge),
            )
            .map_err(|e| JsValue::from_str(&format!("Tessellation error: {:?}", e)))?;

        let mesh = build_mesh(buffers);
        serde_wasm_bindgen::to_value(&mesh)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    #[wasm_bindgen]
    pub fn tessellate_stroke(
        &mut self,
        path_d: &str,
        stroke_width: f32,
        offset_x: f32,
        offset_y: f32,
        scale_x: f32,
        scale_y: f32,
    ) -> Result<JsValue, JsValue> {
        let commands = parse_svg_path_d(path_d);
        let path = build_lyon_path(&commands, offset_x, offset_y, scale_x, scale_y);

        let mut buffers: VertexBuffers<TessVertex, u32> = VertexBuffers::new();

        self.stroke_tessellator
            .tessellate_path(
                &path,
                &StrokeOptions::default()
                    .with_line_width(stroke_width * scale_x.max(scale_y))
                    .with_tolerance(0.1),
                &mut BuffersBuilder::new(&mut buffers, VertexWithEdge),
            )
            .map_err(|e| JsValue::from_str(&format!("Tessellation error: {:?}", e)))?;

        let mesh = build_mesh(buffers);
        serde_wasm_bindgen::to_value(&mesh)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    #[wasm_bindgen]
    pub fn tessellate_svg(
        &mut self,
        svg_content: &str,
        display_width: f32,
        display_height: f32,
    ) -> Result<JsValue, JsValue> {
        let parsed = parse_svg_content(svg_content);
        let native_width = parsed
            .view_box
            .as_ref()
            .map(|v| v.width)
            .unwrap_or(parsed.width);
        let native_height = parsed
            .view_box
            .as_ref()
            .map(|v| v.height)
            .unwrap_or(parsed.height);

        let scale_x = display_width / native_width;
        let scale_y = display_height / native_height;

        let mut all_meshes: Vec<TessellatedMesh> = Vec::new();

        for path in &parsed.paths {
            if path.fill.as_deref() != Some("none") {
                let commands = parse_svg_path_d(&path.d);
                let lyon_path = build_lyon_path(&commands, 0.0, 0.0, scale_x, scale_y);

                let mut buffers: VertexBuffers<TessVertex, u32> = VertexBuffers::new();

                if self
                    .fill_tessellator
                    .tessellate_path(
                        &lyon_path,
                        &FillOptions::default().with_tolerance(0.1),
                        &mut BuffersBuilder::new(&mut buffers, VertexWithEdge),
                    )
                    .is_ok()
                    && !buffers.vertices.is_empty()
                {
                    all_meshes.push(build_mesh(buffers));
                }
            }

            if let (Some(stroke), Some(stroke_width)) = (&path.stroke, path.stroke_width) {
                if stroke != "none" {
                    let commands = parse_svg_path_d(&path.d);
                    let lyon_path = build_lyon_path(&commands, 0.0, 0.0, scale_x, scale_y);

                    let mut buffers: VertexBuffers<TessVertex, u32> = VertexBuffers::new();

                    if self
                        .stroke_tessellator
                        .tessellate_path(
                            &lyon_path,
                            &StrokeOptions::default()
                                .with_line_width(stroke_width * scale_x.max(scale_y))
                                .with_tolerance(0.1),
                            &mut BuffersBuilder::new(&mut buffers, VertexWithEdge),
                        )
                        .is_ok()
                        && !buffers.vertices.is_empty()
                    {
                        all_meshes.push(build_mesh(buffers));
                    }
                }
            }
        }

        serde_wasm_bindgen::to_value(&all_meshes)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

impl Default for SvgTessellator {
    fn default() -> Self {
        Self::new()
    }
}

fn build_mesh(buffers: VertexBuffers<TessVertex, u32>) -> TessellatedMesh {
    let mut bounds = MeshBounds::new();
    // 3 floats per vertex: x, y, edge_dist
    let mut vertices: Vec<f32> = Vec::with_capacity(buffers.vertices.len() * 3);

    for v in &buffers.vertices {
        vertices.push(v.x);
        vertices.push(v.y);
        vertices.push(v.edge_dist);
        bounds.expand(v.x, v.y);
    }

    if !bounds.is_valid() {
        bounds = MeshBounds::default();
    }

    TessellatedMesh {
        vertices,
        indices: buffers.indices,
        bounds,
    }
}

#[derive(Clone, Debug)]
enum SvgCommand {
    MoveTo {
        x: f32,
        y: f32,
        relative: bool,
    },
    LineTo {
        x: f32,
        y: f32,
        relative: bool,
    },
    HLineTo {
        x: f32,
        relative: bool,
    },
    VLineTo {
        y: f32,
        relative: bool,
    },
    CubicTo {
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        x: f32,
        y: f32,
        relative: bool,
    },
    SmoothCubicTo {
        x2: f32,
        y2: f32,
        x: f32,
        y: f32,
        relative: bool,
    },
    QuadTo {
        x1: f32,
        y1: f32,
        x: f32,
        y: f32,
        relative: bool,
    },
    SmoothQuadTo {
        x: f32,
        y: f32,
        relative: bool,
    },
    ArcTo {
        rx: f32,
        ry: f32,
        rotation: f32,
        large_arc: bool,
        sweep: bool,
        x: f32,
        y: f32,
        relative: bool,
    },
    Close,
}

fn parse_svg_path_d(d: &str) -> Vec<SvgCommand> {
    let mut commands = Vec::new();
    let tokens = tokenize_svg_path(d);
    if tokens.is_empty() {
        return commands;
    }

    let mut i = 0;
    let mut current_cmd = 'M';

    let parse_number = |tokens: &[String], i: &mut usize| -> f32 {
        if *i >= tokens.len() {
            return 0.0;
        }
        let val = tokens[*i].parse::<f32>().unwrap_or(0.0);
        *i += 1;
        val
    };

    let parse_flag = |tokens: &[String], i: &mut usize| -> bool {
        if *i >= tokens.len() {
            return false;
        }
        let val = &tokens[*i];
        *i += 1;
        val == "1"
    };

    let is_command = |token: &str| -> bool {
        matches!(
            token,
            "M" | "m"
                | "L"
                | "l"
                | "H"
                | "h"
                | "V"
                | "v"
                | "C"
                | "c"
                | "S"
                | "s"
                | "Q"
                | "q"
                | "T"
                | "t"
                | "A"
                | "a"
                | "Z"
                | "z"
        )
    };

    while i < tokens.len() {
        let token = &tokens[i];

        if is_command(token) {
            current_cmd = token.chars().next().unwrap();
            i += 1;
            if i >= tokens.len() && current_cmd.to_ascii_uppercase() != 'Z' {
                break;
            }
        }

        let relative = current_cmd.is_ascii_lowercase();
        let cmd = current_cmd.to_ascii_uppercase();

        match cmd {
            'M' => {
                commands.push(SvgCommand::MoveTo {
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
                current_cmd = if relative { 'l' } else { 'L' };
            }
            'L' => {
                commands.push(SvgCommand::LineTo {
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'H' => {
                commands.push(SvgCommand::HLineTo {
                    x: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'V' => {
                commands.push(SvgCommand::VLineTo {
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'C' => {
                commands.push(SvgCommand::CubicTo {
                    x1: parse_number(&tokens, &mut i),
                    y1: parse_number(&tokens, &mut i),
                    x2: parse_number(&tokens, &mut i),
                    y2: parse_number(&tokens, &mut i),
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'S' => {
                commands.push(SvgCommand::SmoothCubicTo {
                    x2: parse_number(&tokens, &mut i),
                    y2: parse_number(&tokens, &mut i),
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'Q' => {
                commands.push(SvgCommand::QuadTo {
                    x1: parse_number(&tokens, &mut i),
                    y1: parse_number(&tokens, &mut i),
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'T' => {
                commands.push(SvgCommand::SmoothQuadTo {
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'A' => {
                commands.push(SvgCommand::ArcTo {
                    rx: parse_number(&tokens, &mut i),
                    ry: parse_number(&tokens, &mut i),
                    rotation: parse_number(&tokens, &mut i),
                    large_arc: parse_flag(&tokens, &mut i),
                    sweep: parse_flag(&tokens, &mut i),
                    x: parse_number(&tokens, &mut i),
                    y: parse_number(&tokens, &mut i),
                    relative,
                });
            }
            'Z' => {
                commands.push(SvgCommand::Close);
            }
            _ => {
                i += 1;
            }
        }
    }

    commands
}

fn tokenize_svg_path(d: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut chars = d.chars().peekable();

    while let Some(c) = chars.next() {
        if c.is_ascii_alphabetic() {
            if !current.is_empty() {
                tokens.push(std::mem::take(&mut current));
            }
            tokens.push(c.to_string());
        } else if c == '-' {
            if !current.is_empty() {
                tokens.push(std::mem::take(&mut current));
            }
            current.push(c);
        } else if c == '.' {
            if current.contains('.') {
                tokens.push(std::mem::take(&mut current));
            }
            current.push(c);
        } else if c.is_ascii_digit() {
            current.push(c);
        } else if c == ',' || c.is_whitespace() {
            if !current.is_empty() {
                tokens.push(std::mem::take(&mut current));
            }
        } else if c == 'e' || c == 'E' {
            current.push(c);
            if let Some(&next) = chars.peek() {
                if next == '+' || next == '-' {
                    current.push(chars.next().unwrap());
                }
            }
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

fn build_lyon_path(
    commands: &[SvgCommand],
    offset_x: f32,
    offset_y: f32,
    scale_x: f32,
    scale_y: f32,
) -> lyon::path::Path {
    use lyon::path::Path;

    let mut builder = Path::builder();
    let mut current_x = 0.0f32;
    let mut current_y = 0.0f32;
    let mut start_x = 0.0f32;
    let mut start_y = 0.0f32;
    let mut last_control_x = 0.0f32;
    let mut last_control_y = 0.0f32;
    let mut last_cmd_type: Option<char> = None;

    for cmd in commands {
        match cmd {
            SvgCommand::MoveTo { x, y, relative } => {
                let (nx, ny) = if *relative {
                    (current_x + x, current_y + y)
                } else {
                    (*x, *y)
                };
                let px = nx * scale_x + offset_x;
                let py = ny * scale_y + offset_y;
                builder.begin(Point::new(px, py));
                current_x = nx;
                current_y = ny;
                start_x = nx;
                start_y = ny;
                last_cmd_type = Some('M');
            }
            SvgCommand::LineTo { x, y, relative } => {
                let (nx, ny) = if *relative {
                    (current_x + x, current_y + y)
                } else {
                    (*x, *y)
                };
                let px = nx * scale_x + offset_x;
                let py = ny * scale_y + offset_y;
                builder.line_to(Point::new(px, py));
                current_x = nx;
                current_y = ny;
                last_cmd_type = Some('L');
            }
            SvgCommand::HLineTo { x, relative } => {
                let nx = if *relative { current_x + x } else { *x };
                let px = nx * scale_x + offset_x;
                let py = current_y * scale_y + offset_y;
                builder.line_to(Point::new(px, py));
                current_x = nx;
                last_cmd_type = Some('H');
            }
            SvgCommand::VLineTo { y, relative } => {
                let ny = if *relative { current_y + y } else { *y };
                let px = current_x * scale_x + offset_x;
                let py = ny * scale_y + offset_y;
                builder.line_to(Point::new(px, py));
                current_y = ny;
                last_cmd_type = Some('V');
            }
            SvgCommand::CubicTo {
                x1,
                y1,
                x2,
                y2,
                x,
                y,
                relative,
            } => {
                let (nx1, ny1, nx2, ny2, nx, ny) = if *relative {
                    (
                        current_x + x1,
                        current_y + y1,
                        current_x + x2,
                        current_y + y2,
                        current_x + x,
                        current_y + y,
                    )
                } else {
                    (*x1, *y1, *x2, *y2, *x, *y)
                };
                builder.cubic_bezier_to(
                    Point::new(nx1 * scale_x + offset_x, ny1 * scale_y + offset_y),
                    Point::new(nx2 * scale_x + offset_x, ny2 * scale_y + offset_y),
                    Point::new(nx * scale_x + offset_x, ny * scale_y + offset_y),
                );
                last_control_x = nx2;
                last_control_y = ny2;
                current_x = nx;
                current_y = ny;
                last_cmd_type = Some('C');
            }
            SvgCommand::SmoothCubicTo {
                x2,
                y2,
                x,
                y,
                relative,
            } => {
                let (cx1, cy1) = match last_cmd_type {
                    Some('C') | Some('S') => (
                        2.0 * current_x - last_control_x,
                        2.0 * current_y - last_control_y,
                    ),
                    _ => (current_x, current_y),
                };
                let (nx2, ny2, nx, ny) = if *relative {
                    (current_x + x2, current_y + y2, current_x + x, current_y + y)
                } else {
                    (*x2, *y2, *x, *y)
                };
                builder.cubic_bezier_to(
                    Point::new(cx1 * scale_x + offset_x, cy1 * scale_y + offset_y),
                    Point::new(nx2 * scale_x + offset_x, ny2 * scale_y + offset_y),
                    Point::new(nx * scale_x + offset_x, ny * scale_y + offset_y),
                );
                last_control_x = nx2;
                last_control_y = ny2;
                current_x = nx;
                current_y = ny;
                last_cmd_type = Some('S');
            }
            SvgCommand::QuadTo {
                x1,
                y1,
                x,
                y,
                relative,
            } => {
                let (nx1, ny1, nx, ny) = if *relative {
                    (current_x + x1, current_y + y1, current_x + x, current_y + y)
                } else {
                    (*x1, *y1, *x, *y)
                };
                builder.quadratic_bezier_to(
                    Point::new(nx1 * scale_x + offset_x, ny1 * scale_y + offset_y),
                    Point::new(nx * scale_x + offset_x, ny * scale_y + offset_y),
                );
                last_control_x = nx1;
                last_control_y = ny1;
                current_x = nx;
                current_y = ny;
                last_cmd_type = Some('Q');
            }
            SvgCommand::SmoothQuadTo { x, y, relative } => {
                let (cx, cy) = match last_cmd_type {
                    Some('Q') | Some('T') => (
                        2.0 * current_x - last_control_x,
                        2.0 * current_y - last_control_y,
                    ),
                    _ => (current_x, current_y),
                };
                let (nx, ny) = if *relative {
                    (current_x + x, current_y + y)
                } else {
                    (*x, *y)
                };
                builder.quadratic_bezier_to(
                    Point::new(cx * scale_x + offset_x, cy * scale_y + offset_y),
                    Point::new(nx * scale_x + offset_x, ny * scale_y + offset_y),
                );
                last_control_x = cx;
                last_control_y = cy;
                current_x = nx;
                current_y = ny;
                last_cmd_type = Some('T');
            }
            SvgCommand::ArcTo {
                rx,
                ry,
                rotation,
                large_arc,
                sweep,
                x,
                y,
                relative,
            } => {
                let (nx, ny) = if *relative {
                    (current_x + x, current_y + y)
                } else {
                    (*x, *y)
                };

                if *rx == 0.0 || *ry == 0.0 {
                    builder.line_to(Point::new(nx * scale_x + offset_x, ny * scale_y + offset_y));
                } else {
                    let arc = lyon::geom::SvgArc {
                        from: Point::new(
                            current_x * scale_x + offset_x,
                            current_y * scale_y + offset_y,
                        ),
                        to: Point::new(nx * scale_x + offset_x, ny * scale_y + offset_y),
                        radii: lyon::math::Vector::new(rx * scale_x, ry * scale_y),
                        x_rotation: lyon::geom::Angle::degrees(*rotation),
                        flags: lyon::geom::ArcFlags {
                            large_arc: *large_arc,
                            sweep: *sweep,
                        },
                    };

                    arc.for_each_quadratic_bezier(&mut |q| {
                        builder.quadratic_bezier_to(q.ctrl, q.to);
                    });
                }

                current_x = nx;
                current_y = ny;
                last_cmd_type = Some('A');
            }
            SvgCommand::Close => {
                builder.close();
                current_x = start_x;
                current_y = start_y;
                last_cmd_type = Some('Z');
            }
        }
    }

    builder.build()
}

fn parse_svg_content(svg_content: &str) -> ParsedSvg {
    let mut result = ParsedSvg {
        width: 24.0,
        height: 24.0,
        view_box: None,
        paths: Vec::new(),
    };

    if let Some(cap) = regex_match(svg_content, r#"\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)"#) {
        result.width = cap.parse().unwrap_or(24.0);
    }

    if let Some(cap) = regex_match(svg_content, r#"\bheight\s*=\s*["']?(\d+(?:\.\d+)?)"#) {
        result.height = cap.parse().unwrap_or(24.0);
    }

    if let Some(cap) = regex_match(svg_content, r#"\bviewBox\s*=\s*["']([^"']+)["']"#) {
        let parts: Vec<f32> = cap
            .split(|c: char| c.is_whitespace() || c == ',')
            .filter(|s| !s.is_empty())
            .filter_map(|s| s.parse().ok())
            .collect();
        if parts.len() == 4 {
            result.view_box = Some(ViewBox {
                x: parts[0],
                y: parts[1],
                width: parts[2],
                height: parts[3],
            });
        }
    }

    for path_match in find_all_paths(svg_content) {
        if let Some(d) = extract_attr(&path_match, "d") {
            let fill = extract_attr(&path_match, "fill");
            let stroke = extract_attr(&path_match, "stroke");
            let stroke_width =
                extract_attr(&path_match, "stroke-width").and_then(|s| s.parse().ok());

            result.paths.push(ParsedPath {
                d,
                fill,
                stroke,
                stroke_width,
            });
        }
    }

    for circle_match in find_all_circles(svg_content) {
        if let (Some(cx_str), Some(cy_str), Some(r_str)) = (
            extract_attr(&circle_match, "cx"),
            extract_attr(&circle_match, "cy"),
            extract_attr(&circle_match, "r"),
        ) {
            if let (Ok(cx), Ok(cy), Ok(r)) = (
                cx_str.parse::<f32>(),
                cy_str.parse::<f32>(),
                r_str.parse::<f32>(),
            ) {
                let k = 0.5522847498;
                let d = format!(
                    "M{},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} Z",
                    cx + r, cy,
                    cx + r, cy + k * r, cx + k * r, cy + r, cx, cy + r,
                    cx - k * r, cy + r, cx - r, cy + k * r, cx - r, cy,
                    cx - r, cy - k * r, cx - k * r, cy - r, cx, cy - r,
                    cx + k * r, cy - r, cx + r, cy - k * r, cx + r, cy
                );
                result.paths.push(ParsedPath {
                    d,
                    fill: extract_attr(&circle_match, "fill"),
                    stroke: None,
                    stroke_width: None,
                });
            }
        }
    }

    for rect_match in find_all_rects(svg_content) {
        let x: f32 = extract_attr(&rect_match, "x")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let y: f32 = extract_attr(&rect_match, "y")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        if let (Some(w_str), Some(h_str)) = (
            extract_attr(&rect_match, "width"),
            extract_attr(&rect_match, "height"),
        ) {
            if let (Ok(w), Ok(h)) = (w_str.parse::<f32>(), h_str.parse::<f32>()) {
                let d = format!(
                    "M{},{} L{},{} L{},{} L{},{} Z",
                    x,
                    y,
                    x + w,
                    y,
                    x + w,
                    y + h,
                    x,
                    y + h
                );
                result.paths.push(ParsedPath {
                    d,
                    fill: extract_attr(&rect_match, "fill"),
                    stroke: None,
                    stroke_width: None,
                });
            }
        }
    }

    for polygon_match in find_all_polygons(svg_content) {
        if let Some(points_str) = extract_attr(&polygon_match, "points") {
            let points: Vec<f32> = points_str
                .split(|c: char| c.is_whitespace() || c == ',')
                .filter(|s| !s.is_empty())
                .filter_map(|s| s.parse().ok())
                .collect();

            if points.len() >= 4 {
                let mut d = format!("M{},{}", points[0], points[1]);
                for i in (2..points.len()).step_by(2) {
                    if i + 1 < points.len() {
                        d.push_str(&format!(" L{},{}", points[i], points[i + 1]));
                    }
                }
                d.push_str(" Z");

                result.paths.push(ParsedPath {
                    d,
                    fill: extract_attr(&polygon_match, "fill"),
                    stroke: None,
                    stroke_width: None,
                });
            }
        }
    }

    if let Some(ref vb) = result.view_box {
        result.width = vb.width;
        result.height = vb.height;
    }

    result
}

fn regex_match(text: &str, pattern: &str) -> Option<String> {
    let re = regex_lite::Regex::new(pattern).ok()?;
    let caps = re.captures(text)?;
    caps.get(1).map(|m| m.as_str().to_string())
}

fn find_all_paths(svg_content: &str) -> Vec<String> {
    find_all_elements(svg_content, "path")
}

fn find_all_circles(svg_content: &str) -> Vec<String> {
    find_all_elements(svg_content, "circle")
}

fn find_all_rects(svg_content: &str) -> Vec<String> {
    find_all_elements(svg_content, "rect")
}

fn find_all_polygons(svg_content: &str) -> Vec<String> {
    find_all_elements(svg_content, "polygon")
}

fn find_all_elements(svg_content: &str, tag: &str) -> Vec<String> {
    let mut results = Vec::new();
    let pattern = format!(
        r"<{}\b([^>]*)/?>([\s\S]*?)</{}>|<{}\b([^>]*)/?>",
        tag, tag, tag
    );

    if let Ok(re) = regex_lite::Regex::new(&pattern) {
        for cap in re.captures_iter(svg_content) {
            if let Some(m) = cap.get(0) {
                results.push(m.as_str().to_string());
            }
        }
    }

    if results.is_empty() {
        let simple_pattern = format!(r"<{}\b[^>]*>", tag);
        if let Ok(re) = regex_lite::Regex::new(&simple_pattern) {
            for m in re.find_iter(svg_content) {
                results.push(m.as_str().to_string());
            }
        }
    }

    results
}

fn extract_attr(element: &str, attr: &str) -> Option<String> {
    let pattern = format!(r#"\b{}\s*=\s*["']([^"']*)["']"#, attr);
    regex_match(element, &pattern)
}
