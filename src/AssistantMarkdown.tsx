import React from 'react';

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const tokenPattern = /(\*\*.+?\*\*|__.+?__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) return <code key={key}>{token.slice(1, -1)}</code>;
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{token}</React.Fragment>;
  });
}

export function AssistantMarkdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/).filter(Boolean);
  return <div className="assistant-markdown">{blocks.map((block, index) => {
    const key = `block-${index}`;
    const heading = block.match(/^#{1,3}\s+(.+)$/);
    if (heading) return <h3 key={key}>{renderInlineMarkdown(heading[1], key)}</h3>;

    const lines = block.split('\n');
    const unordered = lines.every(line => /^\s*[-*+]\s+/.test(line));
    const ordered = lines.every(line => /^\s*\d+[.)]\s+/.test(line));
    if (unordered || ordered) {
      const List = ordered ? 'ol' : 'ul';
      return <List key={key}>{lines.map((line, lineIndex) => {
        const item = line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '');
        return <li key={`${key}-${lineIndex}`}>{renderInlineMarkdown(item, `${key}-${lineIndex}`)}</li>;
      })}</List>;
    }

    return <p key={key}>{lines.map((line, lineIndex) => <React.Fragment key={`${key}-${lineIndex}`}>
      {lineIndex > 0 ? <br/> : null}{renderInlineMarkdown(line, `${key}-${lineIndex}`)}
    </React.Fragment>)}</p>;
  })}</div>;
}
