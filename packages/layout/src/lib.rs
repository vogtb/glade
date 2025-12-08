//! WASM-based Taffy layout engine for Flash.
//!
//! Provides a wrapper around Taffy's flexbox/grid layout engine,
//! exposing it via wasm-bindgen for use in TypeScript.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use taffy::prelude::*;
use taffy::{Overflow, Point as TaffyPoint};
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
        Self { x, y, width, height }
    }
}

/// Style input from JavaScript.
/// Maps to Flash's Styles interface.
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
}

impl StyleInput {
    fn to_taffy(&self) -> Style {
        let mut style = Style::default();

        // Display
        if let Some(ref d) = self.display {
            style.display = match d.as_str() {
                "flex" => Display::Flex,
                "block" => Display::Block,
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
            style.flex_basis = Dimension::Length(fb);
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
                width: LengthPercentage::Length(g),
                height: LengthPercentage::Length(g),
            };
        }
        if let Some(rg) = self.row_gap {
            style.gap.height = LengthPercentage::Length(rg);
        }
        if let Some(cg) = self.column_gap {
            style.gap.width = LengthPercentage::Length(cg);
        }

        // Sizing
        if let Some(w) = self.width {
            style.size.width = Dimension::Length(w);
        } else if let Some(wp) = self.width_percent {
            style.size.width = Dimension::Percent(wp / 100.0);
        }

        if let Some(h) = self.height {
            style.size.height = Dimension::Length(h);
        } else if let Some(hp) = self.height_percent {
            style.size.height = Dimension::Percent(hp / 100.0);
        }

        if let Some(mw) = self.min_width {
            style.min_size.width = Dimension::Length(mw);
        } else if let Some(mwp) = self.min_width_percent {
            style.min_size.width = Dimension::Percent(mwp / 100.0);
        }

        if let Some(mw) = self.max_width {
            style.max_size.width = Dimension::Length(mw);
        } else if let Some(mwp) = self.max_width_percent {
            style.max_size.width = Dimension::Percent(mwp / 100.0);
        }

        if let Some(mh) = self.min_height {
            style.min_size.height = Dimension::Length(mh);
        } else if let Some(mhp) = self.min_height_percent {
            style.min_size.height = Dimension::Percent(mhp / 100.0);
        }

        if let Some(mh) = self.max_height {
            style.max_size.height = Dimension::Length(mh);
        } else if let Some(mhp) = self.max_height_percent {
            style.max_size.height = Dimension::Percent(mhp / 100.0);
        }

        // Padding
        if let Some(pt) = self.padding_top {
            style.padding.top = LengthPercentage::Length(pt);
        }
        if let Some(pr) = self.padding_right {
            style.padding.right = LengthPercentage::Length(pr);
        }
        if let Some(pb) = self.padding_bottom {
            style.padding.bottom = LengthPercentage::Length(pb);
        }
        if let Some(pl) = self.padding_left {
            style.padding.left = LengthPercentage::Length(pl);
        }

        // Margin
        if self.margin_top_auto == Some(true) {
            style.margin.top = LengthPercentageAuto::Auto;
        } else if let Some(mt) = self.margin_top {
            style.margin.top = LengthPercentageAuto::Length(mt);
        }

        if self.margin_right_auto == Some(true) {
            style.margin.right = LengthPercentageAuto::Auto;
        } else if let Some(mr) = self.margin_right {
            style.margin.right = LengthPercentageAuto::Length(mr);
        }

        if self.margin_bottom_auto == Some(true) {
            style.margin.bottom = LengthPercentageAuto::Auto;
        } else if let Some(mb) = self.margin_bottom {
            style.margin.bottom = LengthPercentageAuto::Length(mb);
        }

        if self.margin_left_auto == Some(true) {
            style.margin.left = LengthPercentageAuto::Auto;
        } else if let Some(ml) = self.margin_left {
            style.margin.left = LengthPercentageAuto::Length(ml);
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
            style.inset.top = LengthPercentageAuto::Length(t);
        }
        if let Some(r) = self.right {
            style.inset.right = LengthPercentageAuto::Length(r);
        }
        if let Some(b) = self.bottom {
            style.inset.bottom = LengthPercentageAuto::Length(b);
        }
        if let Some(l) = self.left {
            style.inset.left = LengthPercentageAuto::Length(l);
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
                top: LengthPercentage::Length(bw),
                right: LengthPercentage::Length(bw),
                bottom: LengthPercentage::Length(bw),
                left: LengthPercentage::Length(bw),
            };
        }

        style
    }
}

/// The main layout engine, wrapping Taffy.
#[wasm_bindgen]
pub struct TaffyLayoutEngine {
    tree: TaffyTree<()>,
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
            .new_leaf(taffy_style)
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

    /// Get the computed layout for a node.
    #[wasm_bindgen]
    pub fn get_layout(&self, layout_id: &LayoutId) -> Result<LayoutBounds, JsValue> {
        let node_id = self
            .node_map
            .get(&layout_id.0)
            .ok_or_else(|| JsValue::from_str("Invalid layout ID"))?;

        let layout = self.tree.layout(*node_id).map_err(|e| {
            JsValue::from_str(&format!("Failed to get layout: {:?}", e))
        })?;

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
        let child1 = engine.tree.new_leaf(Style {
            size: Size {
                width: Dimension::Length(100.0),
                height: Dimension::Length(50.0),
            },
            ..Default::default()
        }).unwrap();

        let child2 = engine.tree.new_leaf(Style {
            size: Size {
                width: Dimension::Length(100.0),
                height: Dimension::Length(50.0),
            },
            ..Default::default()
        }).unwrap();

        let root = engine.tree.new_with_children(
            Style {
                display: Display::Flex,
                flex_direction: FlexDirection::Column,
                size: Size {
                    width: Dimension::Length(200.0),
                    height: Dimension::Length(200.0),
                },
                ..Default::default()
            },
            &[child1, child2],
        ).unwrap();

        engine.tree.compute_layout(root, Size {
            width: AvailableSpace::Definite(200.0),
            height: AvailableSpace::Definite(200.0),
        }).unwrap();

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
