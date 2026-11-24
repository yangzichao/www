import { EditorSelection, type StateCommand } from '@codemirror/state';

export function toggleInlineMarkup(marker: string): StateCommand {
  return ({ state, dispatch }) => {
    const transaction = state.changeByRange((range) => {
      const isWrapped =
        state.sliceDoc(range.from - marker.length, range.from) === marker &&
        state.sliceDoc(range.to, range.to + marker.length) === marker;
      if (isWrapped) {
        return {
          changes: [
            { from: range.from - marker.length, to: range.from },
            { from: range.to, to: range.to + marker.length },
          ],
          range: EditorSelection.range(range.from - marker.length, range.to - marker.length),
        };
      }
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(range.from + marker.length, range.to + marker.length),
      };
    });
    dispatch(state.update(transaction, { scrollIntoView: true, userEvent: 'input' }));
    return true;
  };
}
