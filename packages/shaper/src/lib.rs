//! WASM-based text shaping engine using cosmic-text.
//!
//! Provides text shaping, font management, and glyph positioning
//! via wasm-bindgen for use in Flash.

use cosmic_text::{
    Attrs, Buffer, Family, FontSystem, Metrics, Shaping, ShapeBuffer, Stretch, Style, Weight, Wrap,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use swash::{
    scale::{Render, ScaleContext, Source, StrikeWith},
    zeno::Format,
    FontRef,
};
use wasm_bindgen::prelude::*;

/// Opaque font ID exposed to JS.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct FontId(u32);

#[wasm_bindgen]
impl FontId {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> u32 {
        self.0
    }
}

/// A shaped glyph with positioning information.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShapedGlyph {
    pub glyph_id: u32,
    pub x: f32,
    pub y: f32,
    pub x_advance: f32,
    pub y_advance: f32,
    pub x_offset: f32,
    pub y_offset: f32,
    pub start: usize,
    pub end: usize,
}

/// A shaped line of text with metrics.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShapedLineResult {
    pub glyphs: Vec<ShapedGlyph>,
    pub width: f32,
    pub height: f32,
    pub ascent: f32,
    pub descent: f32,
}

/// A laid out line from multi-line text.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LayoutLine {
    pub glyphs: Vec<ShapedGlyph>,
    pub width: f32,
    pub y: f32,
    pub line_height: f32,
}

/// Multi-line layout result.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LayoutResult {
    pub lines: Vec<LayoutLine>,
    pub total_width: f32,
    pub total_height: f32,
}

/// Font metrics for a loaded font.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FontMetricsResult {
    pub units_per_em: u16,
    pub ascent: f32,
    pub descent: f32,
    pub line_gap: f32,
}

/// Rasterized glyph result.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RasterizedGlyph {
    pub width: u32,
    pub height: u32,
    pub bearing_x: i32,
    pub bearing_y: i32,
    pub advance: f32,
    pub pixels: Vec<u8>,
}

/// Font style input from JavaScript.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct FontStyleInput {
    pub family: Option<String>,
    pub weight: Option<u16>,
    pub style: Option<String>,
    pub stretch: Option<String>,
}

/// Text shaping engine using cosmic-text.
#[wasm_bindgen]
pub struct TextShaper {
    font_system: FontSystem,
    scale_context: ScaleContext,
    #[allow(dead_code)]
    shape_buffer: ShapeBuffer,
    font_data: HashMap<u32, Vec<u8>>,
    next_font_id: u32,
}

#[wasm_bindgen]
impl TextShaper {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let font_system = FontSystem::new_with_locale_and_db(
            "en-US".to_string(),
            cosmic_text::fontdb::Database::new(),
        );
        Self {
            font_system,
            scale_context: ScaleContext::new(),
            shape_buffer: ShapeBuffer::default(),
            font_data: HashMap::new(),
            next_font_id: 0,
        }
    }

    /// Register a font from raw font data (TTF/OTF bytes).
    /// Returns a FontId that can be used to reference this font.
    #[wasm_bindgen]
    pub fn register_font(&mut self, font_data: &[u8]) -> Result<FontId, JsValue> {
        let id = self.next_font_id;
        self.next_font_id += 1;

        self.font_data.insert(id, font_data.to_vec());

        self.font_system.db_mut().load_font_data(font_data.to_vec());

        Ok(FontId(id))
    }

    /// Get the number of registered fonts.
    #[wasm_bindgen]
    pub fn font_count(&self) -> usize {
        self.font_system.db().len()
    }

    /// Shape a single line of text.
    /// Returns shaped glyphs with positioning information.
    #[wasm_bindgen]
    pub fn shape_line(
        &mut self,
        text: &str,
        font_size: f32,
        line_height: f32,
        style_js: JsValue,
    ) -> Result<JsValue, JsValue> {
        let style: FontStyleInput = serde_wasm_bindgen::from_value(style_js).unwrap_or_default();

        let attrs = self.build_attrs(&style);
        let metrics = Metrics::new(font_size, line_height);

        // Use Buffer for single-line shaping (simpler than ShapeLine)
        let mut buffer = Buffer::new(&mut self.font_system, metrics);
        buffer.set_wrap(&mut self.font_system, Wrap::None);
        buffer.set_text(&mut self.font_system, text, &attrs, Shaping::Advanced, None);
        buffer.shape_until_scroll(&mut self.font_system, false);

        let mut glyphs = Vec::new();
        let mut total_width = 0.0f32;
        let mut max_ascent = 0.0f32;
        let mut max_descent = 0.0f32;

        for run in buffer.layout_runs() {
            for glyph in run.glyphs.iter() {
                glyphs.push(ShapedGlyph {
                    glyph_id: glyph.glyph_id as u32,
                    x: glyph.x,
                    y: glyph.y,
                    x_advance: glyph.w,
                    y_advance: 0.0,
                    x_offset: glyph.x_offset,
                    y_offset: glyph.y_offset,
                    start: glyph.start,
                    end: glyph.end,
                });

                total_width = total_width.max(glyph.x + glyph.w);
            }

            // Get metrics from run
            max_ascent = max_ascent.max(run.line_top);
            max_descent = max_descent.max(run.line_height - run.line_top);
        }

        let result = ShapedLineResult {
            glyphs,
            width: total_width,
            height: line_height,
            ascent: max_ascent,
            descent: max_descent,
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Layout multi-line text with word wrapping.
    #[wasm_bindgen]
    pub fn layout_text(
        &mut self,
        text: &str,
        font_size: f32,
        line_height: f32,
        max_width: f32,
        style_js: JsValue,
    ) -> Result<JsValue, JsValue> {
        let style: FontStyleInput = serde_wasm_bindgen::from_value(style_js).unwrap_or_default();
        let attrs = self.build_attrs(&style);
        let metrics = Metrics::new(font_size, line_height);

        let mut buffer = Buffer::new(&mut self.font_system, metrics);
        buffer.set_size(&mut self.font_system, Some(max_width), None);
        buffer.set_wrap(&mut self.font_system, Wrap::Word);
        buffer.set_text(&mut self.font_system, text, &attrs, Shaping::Advanced, None);
        buffer.shape_until_scroll(&mut self.font_system, false);

        let mut lines = Vec::new();
        let mut total_height = 0.0f32;
        let mut max_width_seen = 0.0f32;

        for run in buffer.layout_runs() {
            let mut line_glyphs = Vec::new();
            let mut line_width = 0.0f32;

            for glyph in run.glyphs.iter() {
                line_glyphs.push(ShapedGlyph {
                    glyph_id: glyph.glyph_id as u32,
                    x: glyph.x,
                    y: glyph.y,
                    x_advance: glyph.w,
                    y_advance: 0.0,
                    x_offset: glyph.x_offset,
                    y_offset: glyph.y_offset,
                    start: glyph.start,
                    end: glyph.end,
                });

                line_width = line_width.max(glyph.x + glyph.w);
            }

            lines.push(LayoutLine {
                glyphs: line_glyphs,
                width: line_width,
                y: run.line_y,
                line_height: run.line_height,
            });

            max_width_seen = max_width_seen.max(line_width);
            total_height = total_height.max(run.line_y + run.line_height);
        }

        let result = LayoutResult {
            lines,
            total_width: max_width_seen,
            total_height,
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Measure text dimensions without full layout.
    #[wasm_bindgen]
    pub fn measure_text(
        &mut self,
        text: &str,
        font_size: f32,
        line_height: f32,
        max_width: Option<f32>,
        style_js: JsValue,
    ) -> Result<JsValue, JsValue> {
        let style: FontStyleInput = serde_wasm_bindgen::from_value(style_js).unwrap_or_default();
        let attrs = self.build_attrs(&style);
        let metrics = Metrics::new(font_size, line_height);

        let mut buffer = Buffer::new(&mut self.font_system, metrics);
        buffer.set_size(&mut self.font_system, max_width, None);
        buffer.set_wrap(
            &mut self.font_system,
            if max_width.is_some() {
                Wrap::Word
            } else {
                Wrap::None
            },
        );
        buffer.set_text(&mut self.font_system, text, &attrs, Shaping::Advanced, None);
        buffer.shape_until_scroll(&mut self.font_system, false);

        let mut total_width = 0.0f32;
        let mut total_height = 0.0f32;

        for run in buffer.layout_runs() {
            let mut line_width = 0.0f32;
            for glyph in run.glyphs.iter() {
                line_width = line_width.max(glyph.x + glyph.w);
            }
            total_width = total_width.max(line_width);
            total_height = total_height.max(run.line_y + run.line_height);
        }

        #[derive(Serialize)]
        struct MeasureResult {
            width: f32,
            height: f32,
        }

        let result = MeasureResult {
            width: total_width,
            height: total_height,
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Rasterize a glyph at the given font size.
    /// Returns the rasterized glyph with alpha coverage values.
    #[wasm_bindgen]
    pub fn rasterize_glyph(
        &mut self,
        font_id: u32,
        glyph_id: u32,
        font_size: f32,
    ) -> Result<JsValue, JsValue> {
        // Get the font data for this font ID
        let font_data = match self.font_data.get(&font_id) {
            Some(data) => data,
            None => {
                return Err(JsValue::from_str("Font not found"));
            }
        };

        // Create a swash FontRef from the font data
        let font = match FontRef::from_index(font_data, 0) {
            Some(f) => f,
            None => {
                return Err(JsValue::from_str("Failed to parse font"));
            }
        };

        // Create a scaler for this font at the given size
        let mut scaler = self
            .scale_context
            .builder(font)
            .size(font_size)
            .hint(true)
            .build();

        // Render the glyph
        let image = Render::new(&[
            Source::ColorOutline(0),
            Source::ColorBitmap(StrikeWith::BestFit),
            Source::Outline,
        ])
        .format(Format::Alpha)
        .render(&mut scaler, glyph_id as u16);

        match image {
            Some(img) => {
                let result = RasterizedGlyph {
                    width: img.placement.width,
                    height: img.placement.height,
                    bearing_x: img.placement.left,
                    bearing_y: img.placement.top,
                    advance: 0.0,
                    pixels: img.data,
                };

                serde_wasm_bindgen::to_value(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
            }
            None => {
                // Return empty glyph (e.g., for space character)
                let result = RasterizedGlyph {
                    width: 0,
                    height: 0,
                    bearing_x: 0,
                    bearing_y: 0,
                    advance: 0.0,
                    pixels: Vec::new(),
                };

                serde_wasm_bindgen::to_value(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
            }
        }
    }

    /// Clear cached data to free memory.
    #[wasm_bindgen]
    pub fn clear_cache(&mut self) {
        self.shape_buffer = ShapeBuffer::default();
    }

    fn build_attrs(&self, style: &FontStyleInput) -> Attrs<'static> {
        let mut attrs = Attrs::new();

        if let Some(ref family) = style.family {
            // We need to leak the string to get a 'static lifetime
            // This is acceptable for font family names as they are typically long-lived
            let family_static: &'static str = Box::leak(family.clone().into_boxed_str());
            attrs = attrs.family(Family::Name(family_static));
        }

        if let Some(weight) = style.weight {
            attrs = attrs.weight(Weight(weight));
        }

        if let Some(ref style_str) = style.style {
            attrs = attrs.style(match style_str.as_str() {
                "italic" => Style::Italic,
                "oblique" => Style::Oblique,
                _ => Style::Normal,
            });
        }

        if let Some(ref stretch_str) = style.stretch {
            attrs = attrs.stretch(match stretch_str.as_str() {
                "ultra-condensed" => Stretch::UltraCondensed,
                "extra-condensed" => Stretch::ExtraCondensed,
                "condensed" => Stretch::Condensed,
                "semi-condensed" => Stretch::SemiCondensed,
                "semi-expanded" => Stretch::SemiExpanded,
                "expanded" => Stretch::Expanded,
                "extra-expanded" => Stretch::ExtraExpanded,
                "ultra-expanded" => Stretch::UltraExpanded,
                _ => Stretch::Normal,
            });
        }

        attrs
    }
}

impl Default for TextShaper {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_shaper() {
        let shaper = TextShaper::new();
        assert_eq!(shaper.font_count(), 0);
    }
}
