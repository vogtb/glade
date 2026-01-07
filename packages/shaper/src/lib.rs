//! WASM-based text shaping engine using cosmic-text.
//!
//! Provides text shaping, font management, and glyph positioning
//! via wasm-bindgen for use in Glade.

use cosmic_text::{
    Attrs, Buffer, CacheKey, CacheKeyFlags, Family, FeatureTag, FontFeatures, FontSystem, Metrics,
    ShapeBuffer, Shaping, Stretch, Style, SwashCache, Weight, Wrap,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    /// The cosmic-text font database ID for this glyph (may differ from requested font due to fallback)
    pub cosmic_font_id: u64,
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
    pub is_color: bool,
}

/// Font style input from JavaScript.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct FontStyleInput {
    pub family: Option<String>,
    pub weight: Option<u16>,
    pub style: Option<String>,
    pub stretch: Option<String>,
}

/// Internal font properties extracted from font file.
#[derive(Clone, Debug, Serialize, Deserialize)]
struct FontInfo {
    /// The internal family name from the font file
    family: String,
    /// The weight from the font file (400 = normal, 700 = bold, 600 = semibold, etc.)
    weight: u16,
}

/// Text shaping engine using cosmic-text.
#[wasm_bindgen]
pub struct TextShaper {
    font_system: FontSystem,
    swash_cache: SwashCache,
    #[allow(dead_code)]
    shape_buffer: ShapeBuffer,
    font_data: HashMap<u32, Vec<u8>>,
    next_font_id: u32,
    /// Maps our registration name to internal font properties
    font_name_to_info: HashMap<String, FontInfo>,
    /// Maps serialized cosmic font ID (u64) back to fontdb::ID for rasterization
    cosmic_id_to_fontdb: HashMap<u64, cosmic_text::fontdb::ID>,
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
            swash_cache: SwashCache::new(),
            shape_buffer: ShapeBuffer::default(),
            font_data: HashMap::new(),
            cosmic_id_to_fontdb: HashMap::new(),
            next_font_id: 0,
            font_name_to_info: HashMap::new(),
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

    /// Register a font with a custom name.
    /// This allows using any name to reference the font, regardless of its internal family name.
    /// The internal family name and weight are extracted from the font file and stored
    /// so that shaping uses the correct internal properties.
    #[wasm_bindgen]
    pub fn register_font_with_name(
        &mut self,
        name: &str,
        font_data: &[u8],
    ) -> Result<FontId, JsValue> {
        let count_before = self.font_system.db().len();

        let id = self.next_font_id;
        self.next_font_id += 1;

        self.font_data.insert(id, font_data.to_vec());

        self.font_system.db_mut().load_font_data(font_data.to_vec());

        // Find the newly added font(s) and extract their properties
        let db = self.font_system.db();
        let faces: Vec<_> = db.faces().collect();

        if faces.len() > count_before {
            // Register all newly added faces in the cosmic_id_to_fontdb mapping
            for face in faces.iter().skip(count_before) {
                let cosmic_id: u64 = format!("{}", face.id).parse().unwrap_or(0);
                self.cosmic_id_to_fontdb.insert(cosmic_id, face.id);
            }

            // Use the first newly added face for font info (primary variant)
            let face = &faces[count_before];

            // Get the English family name (first in the list)
            let family = face
                .families
                .first()
                .map(|(name, _)| name.clone())
                .unwrap_or_else(|| name.to_string());

            let weight = face.weight.0;

            self.font_name_to_info
                .insert(name.to_string(), FontInfo { family, weight });
        }

        Ok(FontId(id))
    }

    /// Get the internal font info for a registered name.
    /// Returns the internal family name and weight if found.
    #[wasm_bindgen]
    pub fn get_font_info(&self, name: &str) -> Result<JsValue, JsValue> {
        if let Some(info) = self.font_name_to_info.get(name) {
            serde_wasm_bindgen::to_value(info)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        } else {
            Ok(JsValue::NULL)
        }
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

        // Use Buffer for shaping - set a large width to allow cosmic-text to
        // process the text without word wrapping
        let mut buffer = Buffer::new(&mut self.font_system, metrics);
        buffer.set_size(&mut self.font_system, Some(f32::MAX), None);
        buffer.set_wrap(&mut self.font_system, Wrap::None);
        buffer.set_text(&mut self.font_system, text, &attrs, Shaping::Advanced, None);
        buffer.shape_until_scroll(&mut self.font_system, false);

        let mut glyphs = Vec::new();
        let mut total_width = 0.0f32;
        let mut max_ascent = 0.0f32;
        let mut max_descent = 0.0f32;

        for run in buffer.layout_runs() {
            for glyph in run.glyphs.iter() {
                let cosmic_font_id: u64 = format!("{}", glyph.font_id).parse().unwrap_or(0);
                glyphs.push(ShapedGlyph {
                    glyph_id: glyph.glyph_id as u32,
                    cosmic_font_id,
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
                let cosmic_font_id: u64 = format!("{}", glyph.font_id).parse().unwrap_or(0);
                line_glyphs.push(ShapedGlyph {
                    glyph_id: glyph.glyph_id as u32,
                    cosmic_font_id,
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

        // Handle explicit newlines when wrapping is disabled. cosmic-text with
        // Wrap::None does not allocate multiple layout runs for '\n', so we
        // split and measure each line ourselves.
        if max_width.is_none() && text.contains('\n') {
            let ascent_offset = font_size * 0.8;
            let mut max_width_seen = 0.0f32;
            let mut line_count = 0usize;

            for line in text.split('\n') {
                let mut buffer = Buffer::new(&mut self.font_system, metrics);
                buffer.set_size(&mut self.font_system, Some(f32::MAX), None);
                buffer.set_wrap(&mut self.font_system, Wrap::None);
                buffer.set_text(&mut self.font_system, line, &attrs, Shaping::Advanced, None);
                buffer.shape_until_scroll(&mut self.font_system, false);

                let mut line_width = 0.0f32;
                for run in buffer.layout_runs() {
                    for glyph in run.glyphs.iter() {
                        line_width = line_width.max(glyph.x + glyph.w);
                    }
                }

                max_width_seen = max_width_seen.max(line_width);
                line_count += 1;
            }

            #[derive(Serialize)]
            struct MeasureResult {
                width: f32,
                height: f32,
            }

            let result = MeasureResult {
                width: max_width_seen,
                height: line_height * line_count as f32 + ascent_offset,
            };

            return serde_wasm_bindgen::to_value(&result)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
        }

        let mut buffer = Buffer::new(&mut self.font_system, metrics);
        // When no max_width is provided, use a very large value to allow cosmic-text
        // to process newlines while not wrapping. This enables whitespace: pre behavior.
        let effective_width = max_width.unwrap_or(f32::MAX);
        buffer.set_size(&mut self.font_system, Some(effective_width), None);
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

    /// Rasterize a glyph using cosmic-text's internal font ID and glyph ID.
    /// This uses SwashCache which properly handles the cosmic-text internal glyph IDs.
    #[wasm_bindgen]
    pub fn rasterize_glyph_by_cosmic_id(
        &mut self,
        cosmic_font_id: u64,
        glyph_id: u32,
        font_size: f32,
        _weight: Option<u16>,
    ) -> Result<JsValue, JsValue> {
        // Look up the fontdb::ID from our mapping
        let font_id = match self.cosmic_id_to_fontdb.get(&cosmic_font_id) {
            Some(&id) => id,
            None => {
                // Font ID not found - return empty glyph
                let result = RasterizedGlyph {
                    width: 0,
                    height: 0,
                    bearing_x: 0,
                    bearing_y: 0,
                    advance: 0.0,
                    pixels: Vec::new(),
                    is_color: false,
                };
                return serde_wasm_bindgen::to_value(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
            }
        };

        // Create the proper CacheKey with the correct font_id
        let (cache_key, _x_int, _y_int) = CacheKey::new(
            font_id,
            glyph_id as u16,
            font_size,
            (0.0, 0.0),
            Weight::NORMAL,
            CacheKeyFlags::empty(),
        );

        // Use SwashCache to get the glyph image
        let image = self
            .swash_cache
            .get_image_uncached(&mut self.font_system, cache_key);

        match image {
            Some(img) => {
                use cosmic_text::SwashContent;
                let (pixels, is_color) = match img.content {
                    SwashContent::Mask => (img.data.clone(), false),
                    SwashContent::SubpixelMask => {
                        // Extract alpha channel from subpixel glyphs
                        let mut alpha = Vec::with_capacity(
                            (img.placement.width as usize)
                                .saturating_mul(img.placement.height as usize),
                        );
                        for chunk in img.data.chunks_exact(4) {
                            alpha.push(chunk[3]);
                        }
                        (alpha, false)
                    }
                    SwashContent::Color => (img.data.clone(), true),
                };

                let result = RasterizedGlyph {
                    width: img.placement.width,
                    height: img.placement.height,
                    bearing_x: img.placement.left,
                    bearing_y: img.placement.top,
                    advance: 0.0,
                    pixels,
                    is_color,
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
                    is_color: false,
                };

                serde_wasm_bindgen::to_value(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
            }
        }
    }

    /// Rasterize a glyph at the given font size (legacy API, prefer rasterize_glyph_by_cosmic_id).
    #[wasm_bindgen]
    pub fn rasterize_glyph(
        &mut self,
        _font_id: u32,
        glyph_id: u32,
        font_size: f32,
        weight: Option<u16>,
    ) -> Result<JsValue, JsValue> {
        // For the legacy API, try to use the first registered font
        let db = self.font_system.db();
        let first_face = db.faces().next();

        match first_face {
            Some(face) => {
                let cosmic_font_id: u64 = format!("{}", face.id).parse().unwrap_or(0);
                self.rasterize_glyph_by_cosmic_id(cosmic_font_id, glyph_id, font_size, weight)
            }
            None => Err(JsValue::from_str("No fonts registered")),
        }
    }

    /// Clear cached data to free memory.
    #[wasm_bindgen]
    pub fn clear_cache(&mut self) {
        self.shape_buffer = ShapeBuffer::default();
    }

    fn build_attrs(&self, style: &FontStyleInput) -> Attrs<'static> {
        let mut attrs = Attrs::new();

        // Check if the family name is a registered name with internal font info
        let (actual_family, internal_weight) = if let Some(ref family) = style.family {
            if let Some(info) = self.font_name_to_info.get(family) {
                // Use the internal family name and weight from the font file
                (Some(info.family.clone()), Some(info.weight))
            } else {
                // Use the family name as-is
                (Some(family.clone()), None)
            }
        } else {
            (None, None)
        };

        if let Some(ref family) = actual_family {
            // We need to leak the string to get a 'static lifetime
            // This is acceptable for font family names as they are typically long-lived
            let family_static: &'static str = Box::leak(family.clone().into_boxed_str());
            attrs = attrs.family(Family::Name(family_static));
        }

        // Use explicit weight from style, or fall back to internal weight from font file
        if let Some(weight) = style.weight {
            attrs = attrs.weight(Weight(weight));
        } else if let Some(weight) = internal_weight {
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

        // Disable contextual alternates (calt) which can cause issues with harfrust shaping
        // in some fonts like JetBrains Mono
        let mut features = FontFeatures::new();
        features.disable(FeatureTag::new(b"calt"));
        attrs = attrs.font_features(features);

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
