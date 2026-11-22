export interface TextStyle {
  className: string;
  fontSizePx: number;
  lineHeightPx: number;
}

export const NODE_TITLE_TEXT: TextStyle = { className: 'wb-text-title', fontSizePx: 15, lineHeightPx: 20 };
export const NODE_DETAIL_TEXT: TextStyle = { className: 'wb-text-detail', fontSizePx: 12.5, lineHeightPx: 16 };
export const CONNECTOR_LABEL_TEXT: TextStyle = { className: 'wb-text-connector', fontSizePx: 12.5, lineHeightPx: 16 };
export const GROUP_TITLE_TEXT: TextStyle = { className: 'wb-text-group', fontSizePx: 13.5, lineHeightPx: 18 };
export const NOTE_TEXT: TextStyle = { className: 'wb-text-note', fontSizePx: 12.5, lineHeightPx: 16 };
