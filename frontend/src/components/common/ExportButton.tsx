import React, { useState } from 'react';
import { Button, Dropdown, message } from 'antd';
import { DownloadOutlined, CopyOutlined, DownOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import { generateDocxBlob } from '../../lib/docxUtils';

interface ExportButtonProps {
  content: string;
  filename: string;
  showCopy?: boolean;
}

export default function ExportButton({ content, filename, showCopy }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  const exportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${filename}.md`);
  };

  const exportWord = async () => {
    setExporting(true);
    try {
      const blob = await generateDocxBlob(content);
      saveAs(blob, `${filename}.docx`);
      message.success('Word 文档导出成功');
    } catch (err) {
      message.error('Word 导出失败：' + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const menuItems = [
    {
      key: 'markdown',
      label: '导出 Markdown (.md)',
      onClick: exportMarkdown,
    },
    {
      key: 'word',
      label: '导出 Word (.docx)',
      onClick: exportWord,
    },
  ];

  if (showCopy) {
    menuItems.unshift({
      key: 'copy',
      label: '复制全部内容',
      onClick: copyToClipboard,
    });
  }

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <Button
        size="small"
        icon={<DownloadOutlined />}
        loading={exporting}
      >
        导出 <DownOutlined />
      </Button>
    </Dropdown>
  );
}
