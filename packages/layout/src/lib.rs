//! WASM-based Taffy layout engine for Glade.
//!
//! Provides a wrapper around Taffy's flexbox/grid layout engine,
//! exposing it via wasm-bindgen for use in TypeScript.

use js_sys::Function;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use taffy::prelude::*;
use taffy::{
    GridAutoFlow, GridPlacement, GridTemplateComponent, MaxTrackSizingFunction,
    MinTrackSizingFunction, Overflow, Point as TaffyPoint, TrackSizingFunction,
};
use wasm_bindgen::prelude::*;

/// Opaque layout node ID exposed to JS.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct LayoutId(u64);

#[wasm_bindgen]
impl LayoutId {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> u64 {
        self.0
    }
}

/// Available space for layout computation.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub enum AvailableSpaceType {
    Definite,
    MinContent,
    MaxContent,
}

/// Available space value passed from JS.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct AvailableSpaceValue {
    pub space_type: u8, // 0 = Definite, 1 = MinContent, 2 = MaxContent
    pub value: f32,     // Only used for Definite
}

impl From<AvailableSpaceValue> for AvailableSpace {
    fn from(v: AvailableSpaceValue) -> Self {
        match v.space_type {
            0 => AvailableSpace::Definite(v.value),
            1 => AvailableSpace::MinContent,
            2 => AvailableSpace::MaxContent,
            _ => AvailableSpace::MaxContent,
        }
    }
}

/// Computed layout bounds for a node.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Default)]
pub struct LayoutBounds {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[wasm_bindgen]
impl LayoutBounds {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }
}

// ============ CSS Grid Input Types ============

/// Track size input from JavaScript.
/// Maps to Glade's TrackSize type.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum TrackSizeInput {
    Fixed {
        value: f32,
    },
    Fr {
        value: f32,
    },
    Auto,
    MinContent,
    MaxContent,
    Minmax {
        min: Box<TrackSizeInput>,
        max: Box<TrackSizeInput>,
    },
}

/// Grid template input from JavaScript.
/// Maps to Glade's GridTemplate type.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum GridTemplateInput {
    /// N equal columns/rows of 1fr each
    Count { value: u16 },
    /// Explicit track sizing
    Tracks { tracks: Vec<TrackSizeInput> },
}

/// Grid placement input from JavaScript.
/// Maps to Glade's GridPlacement type.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum GridPlacementInput {
    Auto,
    Line { value: i16 },
    Span { value: u16 },
}

// ============ Style Input ============

/// Style input from JavaScript.
/// Maps to Glade's Styles interface.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StyleInput {
    // Display & Flexbox
    pub display: Option<String>,
    pub flex_direction: Option<String>,
    pub flex_wrap: Option<String>,
    pub flex_grow: Option<f32>,
    pub flex_shrink: Option<f32>,
    pub flex_basis: Option<f32>,
    pub align_items: Option<String>,
    pub justify_content: Option<String>,
    pub align_self: Option<String>,
    pub gap: Option<f32>,
    pub row_gap: Option<f32>,
    pub column_gap: Option<f32>,

    // CSS Grid Container
    pub grid_template_columns: Option<GridTemplateInput>,
    pub grid_template_rows: Option<GridTemplateInput>,
    pub grid_auto_columns: Option<TrackSizeInput>,
    pub grid_auto_rows: Option<TrackSizeInput>,
    pub grid_auto_flow: Option<String>,

    // CSS Grid Item
    pub grid_column_start: Option<GridPlacementInput>,
    pub grid_column_end: Option<GridPlacementInput>,
    pub grid_row_start: Option<GridPlacementInput>,
    pub grid_row_end: Option<GridPlacementInput>,

    // Sizing
    pub width: Option<f32>,
    pub height: Option<f32>,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub min_height: Option<f32>,
    pub max_height: Option<f32>,

    // Sizing percentages (separate fields for percentage values)
    pub width_percent: Option<f32>,
    pub height_percent: Option<f32>,
    pub min_width_percent: Option<f32>,
    pub max_width_percent: Option<f32>,
    pub min_height_percent: Option<f32>,
    pub max_height_percent: Option<f32>,

    // Spacing
    pub padding_top: Option<f32>,
    pub padding_right: Option<f32>,
    pub padding_bottom: Option<f32>,
    pub padding_left: Option<f32>,
    pub margin_top: Option<f32>,
    pub margin_right: Option<f32>,
    pub margin_bottom: Option<f32>,
    pub margin_left: Option<f32>,

    // Auto margins (separate flags)
    pub margin_top_auto: Option<bool>,
    pub margin_right_auto: Option<bool>,
    pub margin_bottom_auto: Option<bool>,
    pub margin_left_auto: Option<bool>,

    // Position
    pub position: Option<String>,
    pub top: Option<f32>,
    pub right: Option<f32>,
    pub bottom: Option<f32>,
    pub left: Option<f32>,

    // Overflow
    pub overflow: Option<String>,
    pub overflow_x: Option<String>,
    pub overflow_y: Option<String>,

    // Border (for layout purposes - affects content box)
    pub border_width: Option<f32>,

    // Aspect ratio (width / height)
    pub aspect_ratio: Option<f32>,
}

// ============ Grid Type Conversions ============

impl TrackSizeInput {
    /// Convert to Taffy's TrackSizingFunction
    fn to_taffy(&self) -> TrackSizingFunction {
        match self {
            TrackSizeInput::Fixed { value } => TrackSizingFunction::from_length(*value),
            TrackSizeInput::Fr { value } => {
                // Standard fr: minmax(0, Nfr) - allows shrinking to 0
                TrackSizingFunction {
                    min: MinTrackSizingFunction::from_length(0.0),
                    max: MaxTrackSizingFunction::from_fr(*value),
                }
            }
            TrackSizeInput::Auto => TrackSizingFunction::AUTO,
            TrackSizeInput::MinContent => TrackSizingFunction::MIN_CONTENT,
            TrackSizeInput::MaxContent => TrackSizingFunction::MAX_CONTENT,
            TrackSizeInput::Minmax { min, max } => TrackSizingFunction {
                min: min.to_min_track(),
                max: max.to_max_track(),
            },
        }
    }

    /// Convert to MinTrackSizingFunction (for minmax min value)
    fn to_min_track(&self) -> MinTrackSizingFunction {
        match self {
            TrackSizeInput::Fixed { value } => MinTrackSizingFunction::from_length(*value),
            TrackSizeInput::Fr { .. } => {
                // Fr not valid for min, treat as 0
                MinTrackSizingFunction::from_length(0.0)
            }
            TrackSizeInput::Auto => MinTrackSizingFunction::AUTO,
            TrackSizeInput::MinContent => MinTrackSizingFunction::MIN_CONTENT,
            TrackSizeInput::MaxContent => MinTrackSizingFunction::MAX_CONTENT,
            TrackSizeInput::Minmax { min, .. } => min.to_min_track(),
        }
    }

    /// Convert to MaxTrackSizingFunction (for minmax max value)
    fn to_max_track(&self) -> MaxTrackSizingFunction {
        match self {
            TrackSizeInput::Fixed { value } => MaxTrackSizingFunction::from_length(*value),
            TrackSizeInput::Fr { value } => MaxTrackSizingFunction::from_fr(*value),
            TrackSizeInput::Auto => MaxTrackSizingFunction::AUTO,
            TrackSizeInput::MinContent => MaxTrackSizingFunction::MIN_CONTENT,
            TrackSizeInput::MaxContent => MaxTrackSizingFunction::MAX_CONTENT,
            TrackSizeInput::Minmax { max, .. } => max.to_max_track(),
        }
    }
}

impl GridTemplateInput {
    /// Convert to Vec<TrackSizingFunction> for Taffy
    fn to_taffy(&self) -> Vec<GridTemplateComponent<String>> {
        match self {
            GridTemplateInput::Count { value } => {
                // N columns/rows of 1fr each (GPUI pattern: minmax(0, 1fr))
                (0..*value)
                    .map(|_| {
                        GridTemplateComponent::from(TrackSizingFunction {
                            min: MinTrackSizingFunction::from_length(0.0),
                            max: MaxTrackSizingFunction::from_fr(1.0),
                        })
                    })
                    .collect()
            }
            GridTemplateInput::Tracks { tracks } => tracks
                .iter()
                .map(|t| GridTemplateComponent::Single(t.to_taffy()))
                .collect(),
        }
    }
}

impl GridPlacementInput {
    /// Convert to Taffy's GridPlacement
    fn to_taffy(&self) -> GridPlacement {
        match self {
            GridPlacementInput::Auto => GridPlacement::Auto,
            GridPlacementInput::Line { value } => GridPlacement::from_line_index(*value),
            GridPlacementInput::Span { value } => GridPlacement::Span(*value),
        }
    }
}

// ============ StyleInput Conversion ============

impl StyleInput {
    fn to_taffy(&self) -> Style {
        let mut style = Style::default();

        // Display
        if let Some(ref d) = self.display {
            style.display = match d.as_str() {
                "flex" => Display::Flex,
                "block" => Display::Block,
                "grid" => Display::Grid,
                "none" => Display::None,
                _ => Display::Flex,
            };
        }

        // Flex direction
        if let Some(ref fd) = self.flex_direction {
            style.flex_direction = match fd.as_str() {
                "row" => FlexDirection::Row,
                "column" => FlexDirection::Column,
                "row-reverse" => FlexDirection::RowReverse,
                "column-reverse" => FlexDirection::ColumnReverse,
                _ => FlexDirection::Row,
            };
        }

        // Flex wrap
        if let Some(ref fw) = self.flex_wrap {
            style.flex_wrap = match fw.as_str() {
                "wrap" => FlexWrap::Wrap,
                "nowrap" => FlexWrap::NoWrap,
                "wrap-reverse" => FlexWrap::WrapReverse,
                _ => FlexWrap::NoWrap,
            };
        }

        // Flex properties
        if let Some(fg) = self.flex_grow {
            style.flex_grow = fg;
        }
        if let Some(fs) = self.flex_shrink {
            style.flex_shrink = fs;
        }
        if let Some(fb) = self.flex_basis {
            style.flex_basis = Dimension::length(fb);
        }

        // Align items
        if let Some(ref ai) = self.align_items {
            style.align_items = Some(match ai.as_str() {
                "flex-start" => AlignItems::FlexStart,
                "flex-end" => AlignItems::FlexEnd,
                "center" => AlignItems::Center,
                "stretch" => AlignItems::Stretch,
                "baseline" => AlignItems::Baseline,
                _ => AlignItems::Stretch,
            });
        }

        // Justify content
        if let Some(ref jc) = self.justify_content {
            style.justify_content = Some(match jc.as_str() {
                "flex-start" => JustifyContent::FlexStart,
                "flex-end" => JustifyContent::FlexEnd,
                "center" => JustifyContent::Center,
                "space-between" => JustifyContent::SpaceBetween,
                "space-around" => JustifyContent::SpaceAround,
                "space-evenly" => JustifyContent::SpaceEvenly,
                _ => JustifyContent::FlexStart,
            });
        }

        // Align self
        if let Some(ref als) = self.align_self {
            style.align_self = Some(match als.as_str() {
                "flex-start" => AlignSelf::FlexStart,
                "flex-end" => AlignSelf::FlexEnd,
                "center" => AlignSelf::Center,
                "stretch" => AlignSelf::Stretch,
                "baseline" => AlignSelf::Baseline,
                _ => AlignSelf::Start,
            });
        }

        // Gap
        if let Some(g) = self.gap {
            style.gap = Size {
                width: LengthPercentage::length(g),
                height: LengthPercentage::length(g),
            };
        }
        if let Some(rg) = self.row_gap {
            style.gap.height = LengthPercentage::length(rg);
        }
        if let Some(cg) = self.column_gap {
            style.gap.width = LengthPercentage::length(cg);
        }

        // Sizing
        if let Some(w) = self.width {
            style.size.width = Dimension::length(w);
        } else if let Some(wp) = self.width_percent {
            style.size.width = Dimension::percent(wp / 100.0);
        }

        if let Some(h) = self.height {
            style.size.height = Dimension::length(h);
        } else if let Some(hp) = self.height_percent {
            style.size.height = Dimension::percent(hp / 100.0);
        }

        if let Some(mw) = self.min_width {
            style.min_size.width = Dimension::length(mw);
        } else if let Some(mwp) = self.min_width_percent {
            style.min_size.width = Dimension::percent(mwp / 100.0);
        }

        if let Some(mw) = self.max_width {
            style.max_size.width = Dimension::length(mw);
        } else if let Some(mwp) = self.max_width_percent {
            style.max_size.width = Dimension::percent(mwp / 100.0);
        }

        if let Some(mh) = self.min_height {
            style.min_size.height = Dimension::length(mh);
        } else if let Some(mhp) = self.min_height_percent {
            style.min_size.height = Dimension::percent(mhp / 100.0);
        }

        if let Some(mh) = self.max_height {
            style.max_size.height = Dimension::length(mh);
        } else if let Some(mhp) = self.max_height_percent {
            style.max_size.height = Dimension::percent(mhp / 100.0);
        }

        // Padding
        if let Some(pt) = self.padding_top {
            style.padding.top = LengthPercentage::length(pt);
        }
        if let Some(pr) = self.padding_right {
            style.padding.right = LengthPercentage::length(pr);
        }
        if let Some(pb) = self.padding_bottom {
            style.padding.bottom = LengthPercentage::length(pb);
        }
        if let Some(pl) = self.padding_left {
            style.padding.left = LengthPercentage::length(pl);
        }

        // Margin
        if self.margin_top_auto == Some(true) {
            style.margin.top = LengthPercentageAuto::AUTO;
        } else if let Some(mt) = self.margin_top {
            style.margin.top = LengthPercentageAuto::length(mt);
        }

        if self.margin_right_auto == Some(true) {
            style.margin.right = LengthPercentageAuto::AUTO;
        } else if let Some(mr) = self.margin_right {
            style.margin.right = LengthPercentageAuto::length(mr);
        }

        if self.margin_bottom_auto == Some(true) {
            style.margin.bottom = LengthPercentageAuto::AUTO;
        } else if let Some(mb) = self.margin_bottom {
            style.margin.bottom = LengthPercentageAuto::length(mb);
        }

        if self.margin_left_auto == Some(true) {
            style.margin.left = LengthPercentageAuto::AUTO;
        } else if let Some(ml) = self.margin_left {
            style.margin.left = LengthPercentageAuto::length(ml);
        }

        // Position
        if let Some(ref p) = self.position {
            style.position = match p.as_str() {
                "relative" => Position::Relative,
                "absolute" => Position::Absolute,
                _ => Position::Relative,
            };
        }

        if let Some(t) = self.top {
            style.inset.top = LengthPercentageAuto::length(t);
        }
        if let Some(r) = self.right {
            style.inset.right = LengthPercentageAuto::length(r);
        }
        if let Some(b) = self.bottom {
            style.inset.bottom = LengthPercentageAuto::length(b);
        }
        if let Some(l) = self.left {
            style.inset.left = LengthPercentageAuto::length(l);
        }

        // Overflow
        let parse_overflow = |s: &str| match s {
            "visible" => Overflow::Visible,
            "hidden" => Overflow::Hidden,
            "scroll" => Overflow::Scroll,
            _ => Overflow::Visible,
        };

        if let Some(ref o) = self.overflow {
            let ov = parse_overflow(o);
            style.overflow = TaffyPoint { x: ov, y: ov };
        }
        if let Some(ref ox) = self.overflow_x {
            style.overflow.x = parse_overflow(ox);
        }
        if let Some(ref oy) = self.overflow_y {
            style.overflow.y = parse_overflow(oy);
        }

        // Border (affects layout)
        if let Some(bw) = self.border_width {
            style.border = Rect {
                top: LengthPercentage::length(bw),
                right: LengthPercentage::length(bw),
                bottom: LengthPercentage::length(bw),
                left: LengthPercentage::length(bw),
            };
        }

        // Aspect ratio
        if let Some(ar) = self.aspect_ratio {
            style.aspect_ratio = Some(ar);
        }

        // CSS Grid Container Properties
        if let Some(ref cols) = self.grid_template_columns {
            style.grid_template_columns = cols.to_taffy();
        }
        if let Some(ref rows) = self.grid_template_rows {
            style.grid_template_rows = rows.to_taffy();
        }
        if let Some(ref auto_cols) = self.grid_auto_columns {
            style.grid_auto_columns = vec![auto_cols.to_taffy()];
        }
        if let Some(ref auto_rows) = self.grid_auto_rows {
            style.grid_auto_rows = vec![auto_rows.to_taffy()];
        }
        if let Some(ref flow) = self.grid_auto_flow {
            style.grid_auto_flow = match flow.as_str() {
                "row" => GridAutoFlow::Row,
                "column" => GridAutoFlow::Column,
                "row-dense" => GridAutoFlow::RowDense,
                "column-dense" => GridAutoFlow::ColumnDense,
                _ => GridAutoFlow::Row,
            };
        }

        // CSS Grid Item Properties
        if let Some(ref start) = self.grid_column_start {
            style.grid_column.start = start.to_taffy();
        }
        if let Some(ref end) = self.grid_column_end {
            style.grid_column.end = end.to_taffy();
        }
        if let Some(ref start) = self.grid_row_start {
            style.grid_row.start = start.to_taffy();
        }
        if let Some(ref end) = self.grid_row_end {
            style.grid_row.end = end.to_taffy();
        }

        style
    }
}

/// Context stored with each Taffy node.
/// For measurable nodes (e.g., text), stores the measure ID that maps to JS-side data.
#[derive(Clone, Debug, Default)]
pub struct NodeContext {
    /// If Some, this node requires measurement via JS callback.
    /// The u64 is a unique ID that JS uses to look up measurement data.
    pub measure_id: Option<u64>,
}

/// The main layout engine, wrapping Taffy.
#[wasm_bindgen]
pub struct TaffyLayoutEngine {
    tree: TaffyTree<NodeContext>,
    node_map: HashMap<u64, NodeId>,
    reverse_map: HashMap<NodeId, u64>,
    next_id: u64,
}

#[wasm_bindgen]
impl TaffyLayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tree: TaffyTree::new(),
            node_map: HashMap::new(),
            reverse_map: HashMap::new(),
            next_id: 0,
        }
    }

    /// Create a new layout node with the given style.
    /// Returns a LayoutId that can be used to reference this node.
    #[wasm_bindgen]
    pub fn new_leaf(&mut self, style_js: JsValue) -> Result<LayoutId, JsValue> {
        let style_input: StyleInput = serde_wasm_bindgen::from_value(style_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse style: {}", e)))?;

        let taffy_style = style_input.to_taffy();
        let node_id = self
            .tree
            .new_leaf_with_context(taffy_style, NodeContext::default())
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        let id = self.next_id;
        self.next_id += 1;
        self.node_map.insert(id, node_id);
        self.reverse_map.insert(node_id, id);

        Ok(LayoutId(id))
    }

    /// Create a new measurable leaf node (e.g., text).
    /// The measure_id is used by JS to identify which element to measure.
    #[wasm_bindgen]
    pub fn new_measurable_leaf(
        &mut self,
        style_js: JsValue,
        measure_id: u64,
    ) -> Result<LayoutId, JsValue> {
        let style_input: StyleInput = serde_wasm_bindgen::from_value(style_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse style: {}", e)))?;

        let taffy_style = style_input.to_taffy();
        let context = NodeContext {
            measure_id: Some(measure_id),
        };

        let node_id = self
            .tree
            .new_leaf_with_context(taffy_style, context)
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        let id = self.next_id;
        self.next_id += 1;
        self.node_map.insert(id, node_id);
        self.reverse_map.insert(node_id, id);

        Ok(LayoutId(id))
    }

    /// Create a new layout node with children.
    #[wasm_bindgen]
    pub fn new_with_children(
        &mut self,
        style_js: JsValue,
        children_js: JsValue,
    ) -> Result<LayoutId, JsValue> {
        let style_input: StyleInput = serde_wasm_bindgen::from_value(style_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse style: {}", e)))?;

        let child_ids: Vec<u64> = serde_wasm_bindgen::from_value(children_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse children: {}", e)))?;

        let child_nodes: Vec<NodeId> = child_ids
            .iter()
            .filter_map(|id| self.node_map.get(id).copied())
            .collect();

        let taffy_style = style_input.to_taffy();
        let node_id = self
            .tree
            .new_with_children(taffy_style, &child_nodes)
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        let id = self.next_id;
        self.next_id += 1;
        self.node_map.insert(id, node_id);
        self.reverse_map.insert(node_id, id);

        Ok(LayoutId(id))
    }

    /// Update the style of an existing node.
    #[wasm_bindgen]
    pub fn set_style(&mut self, layout_id: &LayoutId, style_js: JsValue) -> Result<(), JsValue> {
        let style_input: StyleInput = serde_wasm_bindgen::from_value(style_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse style: {}", e)))?;

        let node_id = self
            .node_map
            .get(&layout_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        self.tree
            .set_style(*node_id, style_input.to_taffy())
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        Ok(())
    }

    /// Set children of a node.
    #[wasm_bindgen]
    pub fn set_children(
        &mut self,
        layout_id: &LayoutId,
        children_js: JsValue,
    ) -> Result<(), JsValue> {
        let child_ids: Vec<u64> = serde_wasm_bindgen::from_value(children_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse children: {}", e)))?;

        let node_id = self
            .node_map
            .get(&layout_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        let child_nodes: Vec<NodeId> = child_ids
            .iter()
            .filter_map(|id| self.node_map.get(id).copied())
            .collect();

        self.tree
            .set_children(*node_id, &child_nodes)
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        Ok(())
    }

    /// Compute layout for the tree rooted at the given node.
    #[wasm_bindgen]
    pub fn compute_layout(
        &mut self,
        root_id: &LayoutId,
        available_width: f32,
        available_height: f32,
    ) -> Result<(), JsValue> {
        let node_id = self
            .node_map
            .get(&root_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        self.tree
            .compute_layout(
                *node_id,
                Size {
                    width: AvailableSpace::Definite(available_width),
                    height: AvailableSpace::Definite(available_height),
                },
            )
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        Ok(())
    }

    /// Compute layout with a measure function callback for measurable nodes.
    ///
    /// The callback receives: (measure_id, known_width, known_height, available_width, available_height)
    /// And should return: { width: number, height: number }
    #[wasm_bindgen]
    pub fn compute_layout_with_measure(
        &mut self,
        root_id: &LayoutId,
        available_width: f32,
        available_height: f32,
        measure_callback: &Function,
    ) -> Result<(), JsValue> {
        let node_id = self
            .node_map
            .get(&root_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        let this = JsValue::null();

        self.tree
            .compute_layout_with_measure(
                *node_id,
                Size {
                    width: AvailableSpace::Definite(available_width),
                    height: AvailableSpace::Definite(available_height),
                },
                |known_dimensions, available_space, _node_id, node_context, _style| {
                    // Only call JS for nodes with measure_id
                    let Some(context) = node_context else {
                        return Size::ZERO;
                    };
                    let Some(measure_id) = context.measure_id else {
                        return Size::ZERO;
                    };

                    // Convert AvailableSpace to f64 for JS
                    // For MinContent and MaxContent, we pass Infinity to signal "don't wrap"
                    // The JS callback will interpret Infinity as no wrapping constraint
                    let avail_width = match available_space.width {
                        AvailableSpace::Definite(v) => v as f64,
                        AvailableSpace::MinContent => f64::INFINITY,
                        AvailableSpace::MaxContent => f64::INFINITY,
                    };
                    let avail_height = match available_space.height {
                        AvailableSpace::Definite(v) => v as f64,
                        AvailableSpace::MinContent => f64::INFINITY,
                        AvailableSpace::MaxContent => f64::INFINITY,
                    };

                    // Convert known dimensions (None becomes NaN in JS)
                    let known_w = known_dimensions.width.map(|v| v as f64).unwrap_or(f64::NAN);
                    let known_h = known_dimensions
                        .height
                        .map(|v| v as f64)
                        .unwrap_or(f64::NAN);

                    // Call JS: measure_callback(measure_id, known_w, known_h, avail_w, avail_h)
                    let args = js_sys::Array::new();
                    args.push(&JsValue::from(measure_id as f64));
                    args.push(&JsValue::from(known_w));
                    args.push(&JsValue::from(known_h));
                    args.push(&JsValue::from(avail_width));
                    args.push(&JsValue::from(avail_height));

                    let result = match measure_callback.apply(&this, &args) {
                        Ok(r) => r,
                        Err(_) => return Size::ZERO,
                    };

                    // Parse result: { width, height }
                    let width = js_sys::Reflect::get(&result, &"width".into())
                        .ok()
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0) as f32;
                    let height = js_sys::Reflect::get(&result, &"height".into())
                        .ok()
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0) as f32;

                    Size { width, height }
                },
            )
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        Ok(())
    }

    /// Get the computed layout for a node.
    #[wasm_bindgen]
    pub fn get_layout(&self, layout_id: &LayoutId) -> Result<LayoutBounds, JsValue> {
        let node_id = self
            .node_map
            .get(&layout_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        let layout = self
            .tree
            .layout(*node_id)
            .map_err(|e| JsValue::from_str(&format!("Failed to get layout: {:?}", e)))?;

        Ok(LayoutBounds {
            x: layout.location.x,
            y: layout.location.y,
            width: layout.size.width,
            height: layout.size.height,
        })
    }

    /// Remove a node from the tree.
    #[wasm_bindgen]
    pub fn remove(&mut self, layout_id: &LayoutId) -> Result<(), JsValue> {
        let node_id = self
            .node_map
            .remove(&layout_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        self.reverse_map.remove(&node_id);
        self.tree
            .remove(node_id)
            .map_err(|e| JsValue::from_str(&format!("Taffy error: {:?}", e)))?;

        Ok(())
    }

    /// Clear all nodes from the tree.
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.tree.clear();
        self.node_map.clear();
        self.reverse_map.clear();
        self.next_id = 0;
    }

    /// Get the number of nodes in the tree.
    #[wasm_bindgen]
    pub fn node_count(&self) -> usize {
        self.node_map.len()
    }
}

impl Default for TaffyLayoutEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_layout() {
        let mut engine = TaffyLayoutEngine::new();

        // Create a simple column layout
        let child1 = engine
            .tree
            .new_leaf(Style {
                size: Size {
                    width: Dimension::length(100.0),
                    height: Dimension::length(50.0),
                },
                ..Default::default()
            })
            .unwrap();

        let child2 = engine
            .tree
            .new_leaf(Style {
                size: Size {
                    width: Dimension::length(100.0),
                    height: Dimension::length(50.0),
                },
                ..Default::default()
            })
            .unwrap();

        let root = engine
            .tree
            .new_with_children(
                Style {
                    display: Display::Flex,
                    flex_direction: FlexDirection::Column,
                    size: Size {
                        width: Dimension::length(200.0),
                        height: Dimension::length(200.0),
                    },
                    ..Default::default()
                },
                &[child1, child2],
            )
            .unwrap();

        engine
            .tree
            .compute_layout(
                root,
                Size {
                    width: AvailableSpace::Definite(200.0),
                    height: AvailableSpace::Definite(200.0),
                },
            )
            .unwrap();

        let root_layout = engine.tree.layout(root).unwrap();
        assert_eq!(root_layout.size.width, 200.0);
        assert_eq!(root_layout.size.height, 200.0);

        let child1_layout = engine.tree.layout(child1).unwrap();
        assert_eq!(child1_layout.location.x, 0.0);
        assert_eq!(child1_layout.location.y, 0.0);

        let child2_layout = engine.tree.layout(child2).unwrap();
        assert_eq!(child2_layout.location.x, 0.0);
        assert_eq!(child2_layout.location.y, 50.0);
    }
}
