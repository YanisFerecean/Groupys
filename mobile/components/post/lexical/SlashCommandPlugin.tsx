'use dom';

import React, { useCallback, useMemo, useState, type JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
  LexicalEditor,
} from 'lexical';

// Command option class
class SlashCommandOption extends MenuOption {
  keywords: string[];
  onSelect: () => void;

  constructor(
    title: string,
    options: {
      icon: JSX.Element;
      keywords?: string[];
      onSelect: () => void;
    }
  ) {
    super(title);
    this.title = title;
    this.icon = options.icon;
    this.keywords = options.keywords || [];
    this.onSelect = options.onSelect.bind(this);
  }
}

// Icon component for slash command menu
function CommandIcon({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): JSX.Element {
  return (
    <span
      style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#6b7280',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// Get available slash commands
function getSlashCommands(editor: LexicalEditor): SlashCommandOption[] {
  return [
    new SlashCommandOption('Text', {
      icon: <CommandIcon>T</CommandIcon>,
      keywords: ['text', 'paragraph', 'p'],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
      },
    }),
    new SlashCommandOption('Heading 1', {
      icon: <CommandIcon style={{ fontSize: '10px' }}>H1</CommandIcon>,
      keywords: ['heading', 'header', 'h1', 'title'],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'));
          }
        });
      },
    }),
    new SlashCommandOption('Heading 2', {
      icon: <CommandIcon style={{ fontSize: '10px' }}>H2</CommandIcon>,
      keywords: ['heading', 'header', 'h2', 'subtitle'],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'));
          }
        });
      },
    }),
    new SlashCommandOption('Heading 3', {
      icon: <CommandIcon style={{ fontSize: '10px' }}>H3</CommandIcon>,
      keywords: ['heading', 'header', 'h3'],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h3'));
          }
        });
      },
    }),
    new SlashCommandOption('Bullet List', {
      icon: <CommandIcon style={{ fontSize: '14px' }}>•</CommandIcon>,
      keywords: ['bullet', 'list', 'ul', 'unordered'],
      onSelect: () => {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      },
    }),
    new SlashCommandOption('Numbered List', {
      icon: <CommandIcon style={{ fontSize: '10px' }}>1.</CommandIcon>,
      keywords: ['numbered', 'list', 'ol', 'ordered'],
      onSelect: () => {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      },
    }),
  ];
}

// Menu item component
function SlashCommandMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: SlashCommandOption;
}): React.ReactElement {
  return (
    <li
      key={option.key}
      tabIndex={-1}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'slash-command-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
        borderRadius: '6px',
        margin: '2px 0',
        fontSize: '14px',
        color: '#374151',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: 'background-color 0.15s ease',
      }}
    >
      {option.icon}
      <span>{typeof option.title === 'string' ? option.title : 'Text'}</span>
    </li>
  );
}

// Main plugin component
export default function SlashCommandPlugin(): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  // Configure the trigger match (slash character)
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    allowWhitespace: true,
    minLength: 0,
  });

  // Generate command options
  const options = useMemo(() => {
    const commands = getSlashCommands(editor);
    if (!queryString) {
      return commands;
    }
    const regex = new RegExp(queryString, 'i');
    return commands.filter(
      (option) =>
        (typeof option.title === 'string' && regex.test(option.title)) ||
        option.keywords.some((keyword) => regex.test(keyword))
    );
  }, [editor, queryString]);

  // Handle option selection
  const onSelectOption = useCallback(
    (
      selectedOption: SlashCommandOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      _matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect();
        closeMenu();
      });
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashCommandOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (anchorElementRef.current == null || options.length === 0) {
          return null;
        }

        return (
          <div
            style={{
              position: 'absolute',
              left: anchorElementRef.current.getBoundingClientRect().left,
              top: anchorElementRef.current.getBoundingClientRect().bottom + 8,
              minWidth: '200px',
              maxHeight: '300px',
              overflow: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              padding: '4px',
              zIndex: 1000,
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {options.map((option, index) => (
                <SlashCommandMenuItem
                  key={option.key}
                  index={index}
                  isSelected={selectedIndex === index}
                  onClick={() => {
                    setHighlightedIndex(index);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                  }}
                  option={option}
                />
              ))}
            </ul>
          </div>
        );
      }}
    />
  );
}
