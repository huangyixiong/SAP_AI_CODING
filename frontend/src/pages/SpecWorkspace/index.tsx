import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Button,
  Alert,
  Space,
  Typography,
  Input,
  Upload,
  message,
  Select,
  Divider,
} from 'antd';
import {
  ThunderboltOutlined,
  StopOutlined,
  UploadOutlined,
  SendOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import mammoth from 'mammoth';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import CustomPromptPanel from '../../components/common/CustomPromptPanel';
import { useSSE } from '../../hooks/useSSE';
import { optimizePrompt } from '../../api/prompt.api';
import { sendSpecDocuments } from '../../api/mail.api';
import { mailConfigApi } from '../../api/mail-config.api';
import { generateDocxBlob } from '../../lib/docxUtils';
import { EYSpacing, EYTypography } from '../../styles/ey-theme';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface RecipientOption { email: string; name?: string; roleName: string; }

/** 需求规格工作台：规格·需求成稿、规格·开发提示、规格·邮件外发 */
export default function SpecWorkspace() {
  const [requirementText, setRequirementText] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');

  const fsRef = useRef('');
  const [fsContent, setFsContent] = useState('');
  const promptRef = useRef('');
  const [referencePrompt, setReferencePrompt] = useState('');

  const [useCustomFs, setUseCustomFs] = useState(false);
  const [customFsPrompt, setCustomFsPrompt] = useState('');
  const [optimizingFs, setOptimizingFs] = useState(false);

  const [useCustomRef, setUseCustomRef] = useState(false);
  const [customRefPrompt, setCustomRefPrompt] = useState('');
  const [optimizingRef, setOptimizingRef] = useState(false);

  // Mail state
  const [mailTo, setMailTo] = useState<string[]>([]);
  const [mailCc, setMailCc] = useState<string[]>([]);
  const [mailSubject, setMailSubject] = useState(
    () => `需求规格交付 ${new Date().toLocaleDateString('zh-CN')}`
  );
  const [sending, setSending] = useState(false);

  // Recipients list (loaded from mail-config)
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);

  // docx blob cache
  const docxBlobRef = useRef<Blob | null>(null);
  const [docxSizeKB, setDocxSizeKB] = useState<number | null>(null);
  const docxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FIVE_MB = 5 * 1024 * 1024;

  const [fsStatusMsg, setFsStatusMsg] = useState('');
  const [refStatusMsg, setRefStatusMsg] = useState('');

  const {
    status: fsStatus,
    error: fsError,
    start: startFs,
    cancel: cancelFs,
  } = useSSE({
    url: '/api/documents/requirement-fs/stream',
    onChunk: (chunk) => {
      fsRef.current += chunk;
      setFsContent(fsRef.current);
    },
    onStatusEvent: (event) => {
      if (event.type === 'start') setFsStatusMsg('正在准备生成 FS…');
      else if (event.type === 'generating') setFsStatusMsg(String(event.message || '生成中…'));
      else if (event.type === 'warning') setFsStatusMsg(`⚠️ ${event.message}`);
    },
  });

  const {
    status: refStatus,
    error: refError,
    start: startRef,
    cancel: cancelRef,
  } = useSSE({
    url: '/api/documents/reference-prompt/stream',
    onChunk: (chunk) => {
      promptRef.current += chunk;
      setReferencePrompt(promptRef.current);
    },
    onStatusEvent: (event) => {
      if (event.type === 'start') setRefStatusMsg('正在准备生成参考提示词…');
      else if (event.type === 'generating') setRefStatusMsg(String(event.message || '生成中…'));
    },
  });

  // Load recipients on mount
  useEffect(() => {
    mailConfigApi.getRecipients().then((res) => {
      const list: RecipientOption[] = (res.data as Array<{
        email: string; name?: string; isActive: boolean; role: { name: string };
      }>)
        .filter((r) => r.isActive)
        .map((r) => ({ email: r.email, name: r.name, roleName: r.role.name }));
      setRecipients(list);
    }).catch(() => {});
  }, []);

  // Invalidate docx cache immediately on fsContent change, regenerate after debounce
  useEffect(() => {
    docxBlobRef.current = null;
    setDocxSizeKB(null);

    if (!fsContent.trim()) return;

    if (docxDebounceRef.current) clearTimeout(docxDebounceRef.current);
    docxDebounceRef.current = setTimeout(async () => {
      try {
        const blob = await generateDocxBlob(fsContent);
        docxBlobRef.current = blob;
        setDocxSizeKB(Math.round(blob.size / 1024));
      } catch {
        docxBlobRef.current = null;
        setDocxSizeKB(null);
      }
    }, 500);

    return () => {
      if (docxDebounceRef.current) clearTimeout(docxDebounceRef.current);
    };
  }, [fsContent]);

  const handleOptimizeFs = async () => {
    if (!customFsPrompt.trim()) {
      message.warning('请先输入提示词内容');
      return;
    }
    setOptimizingFs(true);
    try {
      const optimized = await optimizePrompt({
        currentPrompt: customFsPrompt,
        context: '需求规格工作台 · 规格·需求成稿（由业务需求生成 FS）',
        requirements: ['保持业务可验收表述', '结构清晰'],
      });
      setCustomFsPrompt(optimized);
      message.success('提示词已优化');
    } catch (error) {
      message.error('优化失败：' + (error as Error).message);
    } finally {
      setOptimizingFs(false);
    }
  };

  const handleOptimizeRef = async () => {
    if (!customRefPrompt.trim()) {
      message.warning('请先输入提示词内容');
      return;
    }
    setOptimizingRef(true);
    try {
      const optimized = await optimizePrompt({
        currentPrompt: customRefPrompt,
        context: '需求规格工作台 · 规格·开发提示（由 FS 生成代码参考提示词）',
        requirements: ['突出实现要点与待确认项', '便于开发人员执行'],
      });
      setCustomRefPrompt(optimized);
      message.success('提示词已优化');
    } catch (error) {
      message.error('优化失败：' + (error as Error).message);
    } finally {
      setOptimizingRef(false);
    }
  };

  const handleGenerateFs = () => {
    if (!requirementText.trim()) {
      message.warning('请填写业务需求描述');
      return;
    }
    fsRef.current = '';
    setFsContent('');
    setFsStatusMsg('');
    startFs({
      requirementText: requirementText.trim(),
      ...(templateContent ? { templateContent } : {}),
      ...(useCustomFs && customFsPrompt.trim() ? { customSystemPrompt: customFsPrompt } : {}),
    });
  };

  const handleGenerateRef = () => {
    if (!fsContent.trim()) {
      message.warning('请先生成或粘贴 FS 内容');
      return;
    }
    promptRef.current = '';
    setReferencePrompt('');
    setRefStatusMsg('');
    startRef({
      fsContent: fsContent.trim(),
      ...(useCustomRef && customRefPrompt.trim() ? { customSystemPrompt: customRefPrompt } : {}),
    });
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSelectToken = (
    value: string[],
    setter: (v: string[]) => void,
    prev: string[]
  ) => {
    const added = value.find((v) => !prev.includes(v));
    if (added && !EMAIL_REGEX.test(added)) {
      message.warning('邮箱格式不正确');
      setter(prev);
      return;
    }
    setter(value);
  };

  const handleSendMail = async () => {
    if (!fsContent.trim()) {
      message.error('FS 未生成，无法发送邮件');
      return;
    }
    if (mailTo.length === 0) {
      message.warning('请填写至少一个收件邮箱');
      return;
    }
    if (!docxBlobRef.current) {
      message.warning('FS 正在处理，请稍后再试');
      return;
    }
    if (docxBlobRef.current.size > FIVE_MB) {
      message.error('附件超过 5MB 限制，无法发送');
      return;
    }

    setSending(true);
    try {
      const arrayBuffer = await docxBlobRef.current.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      uint8.forEach((b) => { binary += String.fromCharCode(b); });
      const attachmentBase64 = btoa(binary);

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const body = referencePrompt.trim() || '请查收附件中的功能规格文档，如有疑问请联系发件人。';

      await sendSpecDocuments({
        to: mailTo,
        ...(mailCc.length ? { cc: mailCc } : {}),
        subject: mailSubject.trim() || '需求规格交付',
        body,
        attachmentBase64,
        attachmentName: `FS_需求规格_${today}.docx`,
      });
      message.success('邮件已发送');
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Group recipients by role, 开发人员 first
  const recipientGroups = (() => {
    const grouped = new Map<string, RecipientOption[]>();
    for (const r of recipients) {
      if (!grouped.has(r.roleName)) grouped.set(r.roleName, []);
      grouped.get(r.roleName)!.push(r);
    }
    const keys = Array.from(grouped.keys()).sort((a, b) =>
      a === '开发人员' ? -1 : b === '开发人员' ? 1 : 0
    );
    return keys.map((role) => ({
      label: role,
      options: grouped.get(role)!.map((r) => ({
        label: r.name ? `${r.name} <${r.email}>` : r.email,
        value: r.email,
      })),
    }));
  })();

  const docxOverLimit = docxBlobRef.current !== null && docxBlobRef.current.size > FIVE_MB;
  const sendDisabled = !fsContent.trim() || docxOverLimit;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>
          需求规格工作台
        </Title>
        <Text type="secondary" style={{ fontSize: EYTypography.sizes.sm }}>
          统一完成：<Text strong>规格·需求成稿</Text> → <Text strong>规格·开发提示</Text> →{' '}
          <Text strong>规格·邮件外发</Text>
        </Text>
      </div>

      {/* 规格·需求成稿 */}
      <Card title="规格·需求成稿" size="small">
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          录入业务顾问的需求说明，生成可编辑的 FS（功能规格）初稿。
        </Text>
        <TextArea
          value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)}
          placeholder="请描述业务背景、目标用户、功能要点、验收期望等…"
          autoSize={{ minRows: 6, maxRows: 16 }}
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: EYSpacing.sm, marginBottom: 12, flexWrap: 'wrap' }}>
          <Upload
            accept=".docx"
            showUploadList={false}
            beforeUpload={(file) => {
              if (!file.name.toLowerCase().endsWith('.docx')) {
                message.error('仅支持上传 .docx 模板文件');
                return false;
              }
              const reader = new FileReader();
              reader.onload = async (e) => {
                try {
                  const arrayBuffer = e.target?.result as ArrayBuffer;
                  if (!arrayBuffer) throw new Error('模板读取失败');
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  setTemplateContent(result.value);
                  setTemplateFileName(file.name);
                } catch (err) {
                  message.error(`模板解析失败：${(err as Error).message}`);
                  setTemplateContent('');
                  setTemplateFileName('');
                }
              };
              reader.readAsArrayBuffer(file);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} size="small">
              {templateFileName || '上传 Word 模板（可选）'}
            </Button>
          </Upload>
          {templateFileName && (
            <>
              <Text type="secondary" style={{ fontSize: EYTypography.sizes.xs }}>
                {templateFileName}
              </Text>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => {
                  setTemplateContent('');
                  setTemplateFileName('');
                }}
                style={{ padding: 0, height: 'auto' }}
              >
                移除
              </Button>
            </>
          )}
        </div>

        <CustomPromptPanel
          enabled={useCustomFs}
          customPrompt={customFsPrompt}
          onEnabledChange={setUseCustomFs}
          onPromptChange={setCustomFsPrompt}
          onOptimizePrompt={handleOptimizeFs}
          optimizing={optimizingFs}
          placeholder="自定义「规格·需求成稿」时 AI 的角色、章节与输出要求…"
        />

        <Space>
          {(fsStatus === 'loading' || fsStatus === 'generating') && (
            <Button icon={<StopOutlined />} onClick={cancelFs} size="small">
              停止
            </Button>
          )}
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            disabled={fsStatus === 'loading' || fsStatus === 'generating'}
            loading={fsStatus === 'loading'}
            onClick={handleGenerateFs}
            style={{ background: '#FFE600', color: '#2E2E38', borderColor: '#FFE600' }}
          >
            生成 FS
          </Button>
        </Space>
        {fsStatusMsg && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            {fsStatusMsg}
          </Text>
        )}
        {fsError && (
          <Alert type="error" message={fsError} showIcon style={{ marginTop: 8 }} />
        )}
      </Card>

      {/* FS 可编辑 + 预览 */}
      <Card
        title="FS（可编辑）"
        size="small"
        extra={
          fsContent ? (
            <ExportButton content={fsContent} filename="FS_需求规格" />
          ) : null
        }
      >
        <TextArea
          value={fsContent}
          onChange={(e) => {
            fsRef.current = e.target.value;
            setFsContent(e.target.value);
          }}
          placeholder="生成后将显示在此，您可直接修改后再进行「规格·开发提示」…"
          autoSize={{ minRows: 10, maxRows: 28 }}
          style={{ fontFamily: 'Consolas, Monaco, Microsoft YaHei, sans-serif', fontSize: 13 }}
        />
        {fsContent.length > 0 && (
          <Divider orientation="left" plain style={{ marginTop: 16 }}>
            预览
          </Divider>
        )}
        {fsContent.length > 0 && (
          <MarkdownPreview
            content={fsContent}
            style={{ maxHeight: 400, overflowY: 'auto', padding: 8 }}
          />
        )}
      </Card>

      {/* 规格·开发提示 */}
      <Card title="规格·开发提示" size="small">
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          根据当前 FS 智能生成<strong>一版</strong>用于指导 ABAP 实现的参考系统提示词（非完整代码）。
        </Text>

        <CustomPromptPanel
          enabled={useCustomRef}
          customPrompt={customRefPrompt}
          onEnabledChange={setUseCustomRef}
          onPromptChange={setCustomRefPrompt}
          onOptimizePrompt={handleOptimizeRef}
          optimizing={optimizingRef}
          placeholder="自定义参考提示词的结构侧重，如：权限、性能、测试要点…"
        />

        <Space>
          {(refStatus === 'loading' || refStatus === 'generating') && (
            <Button icon={<StopOutlined />} onClick={cancelRef} size="small">
              停止
            </Button>
          )}
          <Button
            type="primary"
            icon={<RocketOutlined />}
            disabled={refStatus === 'loading' || refStatus === 'generating'}
            loading={refStatus === 'loading'}
            onClick={handleGenerateRef}
            style={{ background: '#FFE600', color: '#2E2E38', borderColor: '#FFE600' }}
          >
            生成代码参考提示词
          </Button>
        </Space>
        {refStatusMsg && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            {refStatusMsg}
          </Text>
        )}
        {refError && (
          <Alert type="error" message={refError} showIcon style={{ marginTop: 8 }} />
        )}

        <Divider plain style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>参考提示词（可编辑）</Text>
          {referencePrompt ? (
            <ExportButton content={referencePrompt} filename="代码参考提示词" />
          ) : null}
        </div>
        <TextArea
          value={referencePrompt}
          onChange={(e) => {
            promptRef.current = e.target.value;
            setReferencePrompt(e.target.value);
          }}
          placeholder="点击上方按钮，根据 FS 生成；也可手动粘贴…"
          autoSize={{ minRows: 8, maxRows: 24 }}
          style={{ fontFamily: 'Consolas, Monaco, Microsoft YaHei, sans-serif', fontSize: 13 }}
        />
      </Card>

      {/* 规格·邮件外发 */}
      <Card title="规格·邮件外发" size="small">
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {!referencePrompt.trim() && (
            <Alert
              type="warning"
              showIcon
              message="开发提示词未生成，将使用默认正文发送"
            />
          )}
          {!fsContent.trim() && (
            <Alert
              type="error"
              showIcon
              message="FS 未生成，无法发送邮件"
            />
          )}

          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>
              收件人 <span style={{ color: 'red' }}>*</span>
            </Text>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="下拉选择或输入邮箱后回车"
              options={recipientGroups}
              value={mailTo}
              onChange={(val) => handleSelectToken(val, setMailTo, mailTo)}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              tokenSeparators={[',', ';']}
            />
          </div>

          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>抄送（可选）</Text>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="下拉选择或输入邮箱后回车"
              options={recipientGroups}
              value={mailCc}
              onChange={(val) => handleSelectToken(val, setMailCc, mailCc)}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              tokenSeparators={[',', ';']}
            />
          </div>

          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>主题</Text>
            <Input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} />
          </div>

          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>附件</Text>
            {fsContent.trim() ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                background: docxOverLimit ? '#fff2f0' : '#f6ffed',
                border: `1px solid ${docxOverLimit ? '#ffccc7' : '#b7eb8f'}`,
              }}>
                <span>📎</span>
                <Text style={{ color: docxOverLimit ? '#ff4d4f' : undefined }}>
                  {`FS_需求规格_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.docx`}
                  {docxSizeKB !== null && ` (~${docxSizeKB} KB)`}
                  {docxSizeKB === null && fsContent.trim() && ' (生成中…)'}
                </Text>
                {docxOverLimit && (
                  <Text type="danger" style={{ fontSize: 12 }}>超过 5MB 限制，无法发送</Text>
                )}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>请先生成 FS</Text>
            )}
          </div>

          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            disabled={sendDisabled}
            onClick={handleSendMail}
            style={sendDisabled ? undefined : { background: '#FFE600', color: '#2E2E38', borderColor: '#FFE600' }}
          >
            发送邮件
          </Button>
        </Space>
      </Card>
    </Space>
  );
}
