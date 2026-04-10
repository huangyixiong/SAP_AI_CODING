import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  style?: React.CSSProperties;
}

export default function MarkdownPreview({ content, style }: MarkdownPreviewProps) {
  return (
    <div
      style={{
        fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
        lineHeight: 1.7,
        color: '#333',
        ...style,
      }}
      className="markdown-body"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match !== null;
            return isBlock ? (
              <pre
                style={{
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: '12px 16px',
                  borderRadius: 6,
                  overflow: 'auto',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code
                style={{
                  background: '#f0f0f0',
                  padding: '2px 5px',
                  borderRadius: 3,
                  fontSize: '0.9em',
                  fontFamily: 'Consolas, monospace',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th
              style={{
                border: '1px solid #ddd',
                padding: '8px 12px',
                background: '#f5f5f5',
                textAlign: 'left',
                fontWeight: 600,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                border: '1px solid #ddd',
                padding: '8px 12px',
              }}
            >
              {children}
            </td>
          ),
          h1: ({ children }) => (
            <h1 style={{ borderBottom: '3px solid #FFE600', paddingBottom: 8, color: '#2E2E38' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ borderBottom: '2px solid #FFE600', paddingBottom: 6, color: '#2E2E38' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ borderLeft: '3px solid #FFE600', paddingLeft: 8, color: '#2E2E38' }}>
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '4px solid #FFE600',
                paddingLeft: 12,
                color: '#747480',
                background: '#FFFDE0',
                margin: '8px 0',
                padding: '8px 12px',
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
