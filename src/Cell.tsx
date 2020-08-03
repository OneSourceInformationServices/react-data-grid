import React, { forwardRef, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

import { EditorContainer, EditorPortal } from './editors';
import { CellRendererProps } from './types';
import { wrapEvent } from './utils';
import { useCombinedRefs } from './hooks';

function Cell<R, SR>({
  className,
  column,
  isCopied,
  isDraggedOver,
  isRowSelected,
  lastFrozenColumnIndex,
  row,
  rowIdx,
  eventBus,
  selectedCellProps,
  onRowClick,
  onKeyDown,
  onClick,
  onDoubleClick,
  onContextMenu,
  ...props
}: CellRendererProps<R, SR>, ref: React.Ref<HTMLDivElement>) {
  const cellRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedCellProps !== undefined;
  const isEditing = selectedCellProps?.mode === 'EDIT';

  const { cellClass } = column;
  className = clsx(
    'rdg-cell',
    {
      'rdg-cell-frozen': column.frozen,
      'rdg-cell-frozen-last': column.idx === lastFrozenColumnIndex,
      'rdg-cell-selected': isSelected,
      'rdg-cell-copied': isCopied,
      'rdg-cell-dragged-over': isDraggedOver,
      'rdg-cell-editing': selectedCellProps?.mode === 'EDIT'
    },
    typeof cellClass === 'function' ? cellClass(row) : cellClass,
    className
  );

  function selectCell(openEditor?: boolean) {
    eventBus.dispatch('SELECT_CELL', { idx: column.idx, rowIdx }, openEditor);
  }

  function handleClick() {
    selectCell(column.editorOptions?.editOnClick);
    onRowClick?.(rowIdx, row, column);
  }

  function handleContextMenu() {
    selectCell();
  }

  function handleDoubleClick() {
    selectCell(true);
  }

  function onRowSelectionChange(checked: boolean, isShiftClick: boolean) {
    eventBus.dispatch('SELECT_ROW', { rowIdx, checked, isShiftClick });
  }

  function getCellContent() {
    if (selectedCellProps && selectedCellProps.mode === 'EDIT') {
      if (cellRef.current === null) return;
      const { editorPortalTarget, editorContainerProps, editor2Props } = selectedCellProps;
      const { scrollTop: docTop, scrollLeft: docLeft } = document.scrollingElement || document.documentElement;
      const { left, top } = cellRef.current.getBoundingClientRect();
      const gridLeft = left + docLeft;
      const gridTop = top + docTop;

      if (column.editor2 !== undefined) {
        const editor2 = (
          <column.editor2
            {...editor2Props}
            rowIdx={rowIdx}
            column={column}
            left={gridLeft}
            top={gridTop}
          />
        );

        if (column.editorOptions?.createPortal) {
          return createPortal(editor2, editorPortalTarget);
        }

        return editor2;
      }

      const editor1 = (
        <EditorContainer<R, SR>
          {...editorContainerProps}
          rowIdx={rowIdx}
          row={row}
          column={column}
          left={gridLeft}
          top={gridTop}
        />
      );

      if (column.editorOptions?.createPortal !== false) {
        return (
          <EditorPortal target={editorPortalTarget}>
            {editor1}
          </EditorPortal>
        );
      }

      return editor1;
    }

    return (
      <>
        <column.formatter
          column={column}
          rowIdx={rowIdx}
          row={row}
          isCellSelected={isSelected}
          isRowSelected={isRowSelected}
          onRowSelectionChange={onRowSelectionChange}
        />
        {selectedCellProps?.dragHandleProps && (
          <div className="rdg-cell-drag-handle" {...selectedCellProps.dragHandleProps} />
        )}
      </>
    );
  }

  return (
    <div
      role="gridcell"
      aria-colindex={column.idx + 1} // aria-colindex is 1-based
      aria-selected={isSelected}
      ref={useCombinedRefs(cellRef, ref)}
      className={className}
      style={{
        width: column.width,
        left: column.left
      }}
      onKeyDown={selectedCellProps ? wrapEvent(selectedCellProps.onKeyDown, onKeyDown) : onKeyDown}
      onClick={isEditing ? onClick : wrapEvent(handleClick, onClick)}
      onDoubleClick={isEditing ? onDoubleClick : wrapEvent(handleDoubleClick, onDoubleClick)}
      onContextMenu={isEditing ? onContextMenu : wrapEvent(handleContextMenu, onContextMenu)}
      {...props}
    >
      {getCellContent()}
    </div>
  );
}

export default memo(forwardRef(Cell)) as <R, SR = unknown>(props: CellRendererProps<R, SR>) => JSX.Element;
