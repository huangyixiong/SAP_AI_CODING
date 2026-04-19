import React, { useRef, useState } from 'react';
import {
  Card, Button, Input, Alert, Space, Typography, Row, Col, Steps, Divider, message, Grid, Modal, Switch, Segmented
} from 'antd';
import { ThunderboltOutlined, StopOutlined, CloudUploadOutlined } from '@ant-design/icons';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import CustomPromptPanel from '../../components/common/CustomPromptPanel';
import ObjectSearchInput from '../../components/sap/ObjectSearchInput';
import { useSSE } from '../../hooks/useSSE';
import { optimizePrompt } from '../../api/prompt.api';
import { activateAfterWrite, ActivationMode, precheckWriteBackToSAP, writeBackToSAP } from '../../api/sap.api';
import { SAPObject } from '../../types';

const { TextArea } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;

type WriteBackStatus = 'idle' | 'loading' | 'success' | 'error';
type PrecheckStatus = 'idle' | 'loading' | 'success' | 'error';
type ActivationStatus = 'idle' | 'pending' | 'loading' | 'success' | 'error';
type PrecheckErrorCode =
  | 'LOCK_CONFLICT'
  | 'OBJECT_URL_INVALID'
  | 'OBJECT_NAME_MISMATCH'
  | 'TRANSPORT_REQUIRED'
  | 'SYNTAX_CHECK_FAILED'
  | 'WRITE_SOURCE_FAILED'
  | 'ACTIVATION_FAILED'
  | 'UNLOCK_FAILED'
  | 'MCP_TIMEOUT'
  | 'SAP_SESSION_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

function extractObjectNameFromUrl(url: string): string {
  const normalized = url.replace(/\/source\/main\/?$/i, '').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toUpperCase();
}

export default function FSToCode() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [fsContent, setFsContent] = useState('');
  const [targetProgramName, setTargetProgramName] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [transportNumber, setTransportNumber] = useState('');
  const [generatedProgramName, setGeneratedProgramName] = useState('');
  const [manualUrlMode, setManualUrlMode] = useState(false);
  const [selectedWriteBackObject, setSelectedWriteBackObject] = useState<SAPObject | null>(null);
  const codeRef = useRef('');
  const [displayCode, setDisplayCode] = useState('');
  const [writeBackStatus, setWriteBackStatus] = useState<WriteBackStatus>('idle');
  const [writeBackError, setWriteBackError] = useState('');
  const [precheckStatus, setPrecheckStatus] = useState<PrecheckStatus>('idle');
  const [precheckEnabled, setPrecheckEnabled] = useState(true);
  const [precheckMessage, setPrecheckMessage] = useState('');
  const [precheckErrorCode, setPrecheckErrorCode] = useState<PrecheckErrorCode | null>(null);
  const [activationMode, setActivationMode] = useState<ActivationMode>('auto');
  const [activationStatus, setActivationStatus] = useState<ActivationStatus>('idle');
  const [activationMessage, setActivationMessage] = useState('');
  
  // 自定义提示词状态
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/code/stream',
    onChunk: (chunk) => {
      codeRef.current += chunk;
      setDisplayCode(codeRef.current);
    },
  });

  // 优化提示词
  const handleOptimizePrompt = async () => {
    if (!customPrompt.trim()) {
      message.warning('请先输入提示词内容');
      return;
    }

    setOptimizing(true);
    try {
      const optimized = await optimizePrompt({
        currentPrompt: customPrompt,
        context: '从功能规格书(FS)生成ABAP代码',
        requirements: ['强调编码规范', '包含错误处理', '性能优化'],
      });
      setCustomPrompt(optimized);
      message.success('提示词已优化');
    } catch (error) {
      message.error('优化失败：' + (error as Error).message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerate = () => {
    const trimmedFs = fsContent.trim();
    const trimmedProgramName = targetProgramName.trim().toUpperCase();
    if (!trimmedFs) return;
    if (!trimmedProgramName) {
      message.warning('请先输入目标程序名称');
      return;
    }
    codeRef.current = '';
    setDisplayCode('');
    setWriteBackStatus('idle');
    setPrecheckStatus('idle');
    setPrecheckMessage('');
    setPrecheckErrorCode(null);
    setActivationStatus('idle');
    setActivationMessage('');
    setGeneratedProgramName(trimmedProgramName);
    start({ 
      fsContent: trimmedFs,
      targetProgramName: trimmedProgramName,
      // 只有勾选且非空时才传递自定义提示词
      ...(useCustomPrompt && customPrompt.trim() ? { customSystemPrompt: customPrompt } : {}),
    });
  };

  const handleWriteBack = async () => {
    const effectiveObjectUrl = (manualUrlMode ? objectUrl : selectedWriteBackObject?.objectUrl || '').trim();
    if (!effectiveObjectUrl || !targetProgramName.trim() || !codeRef.current) return;

    // Extract pure ABAP code from markdown code block if wrapped
    let source = codeRef.current;
    const codeBlockMatch = source.match(/```(?:\s*abap)?\s*\r?\n([\s\S]*?)```/i);
    if (!codeBlockMatch) {
      setWriteBackStatus('error');
      setWriteBackError('未检测到 ABAP 代码块，请先规范化生成结果后再写回');
      return;
    }
    source = codeBlockMatch[1];
    source = source.replace(/^\s+|\s+$/g, '');
    const urlObjectName = extractObjectNameFromUrl(effectiveObjectUrl);
    const expectedName = (generatedProgramName || targetProgramName).trim().toUpperCase();
    if (urlObjectName && expectedName && urlObjectName !== expectedName) {
      setWriteBackStatus('error');
      setWriteBackError(`对象 URL 名称(${urlObjectName})与目标程序名称(${expectedName})不一致`);
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认写回 SAP',
        content: (
          <div>
            <div>程序名称：{expectedName}</div>
            <div style={{ marginTop: 6 }}>对象 URL：{effectiveObjectUrl}</div>
            <div style={{ marginTop: 6 }}>Transport：{transportNumber.trim() || '未填写'}</div>
          </div>
        ),
        okText: '确认写回',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) {
      return;
    }

    setWriteBackStatus('loading');
    setWriteBackError('');
    try {
      const result = await writeBackToSAP({
        objectUrl: effectiveObjectUrl,
        objectName: targetProgramName.trim(),
        source,
        transportNumber: transportNumber.trim() || undefined,
        activationMode,
      });
      if (result.requestSuccess && result.writeSuccess) {
        setWriteBackStatus('success');
        if (activationMode === 'auto') {
          if (result.activationSuccess === true) {
            setActivationStatus('success');
            setActivationMessage('自动激活成功');
            message.success('代码已成功写回 SAP 并激活！');
          } else {
            setActivationStatus('error');
            setActivationMessage(result.error || '自动激活失败，请改为手动激活重试');
            message.warning('写回成功，但自动激活失败');
          }
        } else {
          setActivationStatus('pending');
          setActivationMessage('已写回，等待手动激活');
          message.success('代码已写回 SAP（手动激活模式）');
        }
      } else {
        setWriteBackStatus('error');
        setWriteBackError(result.error || '写回失败');
      }
    } catch (err) {
      setWriteBackStatus('error');
      setWriteBackError((err as Error).message);
    }
  };

  const handlePrecheckWriteBack = async () => {
    const trimmedObjectUrl = (manualUrlMode ? objectUrl : selectedWriteBackObject?.objectUrl || '').trim();
    const expectedName = (generatedProgramName || targetProgramName).trim().toUpperCase();
    if (!trimmedObjectUrl || !expectedName) {
      message.warning('请先选择 SAP 对象（或填写 URL）和目标程序名称');
      return;
    }
    let precheckSource = codeRef.current;
    const precheckCodeBlockMatch = precheckSource.match(/```(?:\s*abap)?\s*\r?\n([\s\S]*?)```/i);
    if (precheckCodeBlockMatch) {
      precheckSource = precheckCodeBlockMatch[1];
    }
    precheckSource = precheckSource.replace(/^\s+|\s+$/g, '');
    setPrecheckStatus('loading');
    setPrecheckMessage('');
    setPrecheckErrorCode(null);
    try {
      const result = await precheckWriteBackToSAP({
        objectUrl: trimmedObjectUrl,
        objectName: expectedName,
        source: precheckSource,
      });
      if (result.requestSuccess) {
        setPrecheckStatus('success');
        setPrecheckErrorCode(null);
        setPrecheckMessage(`预检查通过，可写回（sourceUrl: ${result.data?.sourceUrl || '已验证'}）`);
        message.success('写回预检查通过');
      } else {
        setPrecheckStatus('error');
        setPrecheckErrorCode((result.errorCode as PrecheckErrorCode) || 'UNKNOWN_ERROR');
        setPrecheckMessage(result.error || '预检查失败');
      }
    } catch (err) {
      setPrecheckStatus('error');
      setPrecheckErrorCode('UNKNOWN_ERROR');
      setPrecheckMessage((err as Error).message || '预检查失败');
    }
  };

  const getPrecheckResolution = (): { title: string; actions: string[] } | null => {
    if (precheckStatus !== 'error' || !precheckErrorCode) return null;
    switch (precheckErrorCode) {
      case 'OBJECT_NAME_MISMATCH':
        return {
          title: '对象名与程序名不一致',
          actions: ['一键同步程序名为对象名', '重新选择正确的 SAP 对象'],
        };
      case 'OBJECT_URL_INVALID':
        return {
          title: '对象 URL 不合法',
          actions: ['关闭手动URL模式并使用对象搜索选择', '检查URL是否以 /sap/bc/adt/ 开头'],
        };
      case 'SYNTAX_CHECK_FAILED':
        return {
          title: '语法检查未通过',
          actions: ['返回上方重新生成代码', '如使用自定义提示词，请降低约束后重试'],
        };
      case 'LOCK_CONFLICT':
        return {
          title: '对象当前被锁定',
          actions: ['稍后重试预检查', '联系占锁人员释放锁'],
        };
      case 'TRANSPORT_REQUIRED':
        return {
          title: '需要有效的 Transport',
          actions: ['填写/更换 Transport 编号后重试', '联系 Basis/开发确认可用请求'],
        };
      case 'SAP_SESSION_UNAVAILABLE':
      case 'MCP_TIMEOUT':
        return {
          title: 'SAP 会话或连接异常',
          actions: ['等待 10-30 秒后重试预检查', '若持续失败，重启服务后再试'],
        };
      default:
        return {
          title: '预检查失败',
          actions: ['重试预检查', '切换对象后重新预检查'],
        };
    }
  };

  const handleActivateNow = async () => {
    const effectiveObjectUrl = (manualUrlMode ? objectUrl : selectedWriteBackObject?.objectUrl || '').trim();
    const expectedName = (generatedProgramName || targetProgramName).trim().toUpperCase();
    if (!effectiveObjectUrl || !expectedName) {
      message.warning('请先确认对象与程序名称');
      return;
    }
    setActivationStatus('loading');
    setActivationMessage('');
    try {
      const result = await activateAfterWrite({
        objectUrl: effectiveObjectUrl,
        objectName: expectedName,
      });
      if (result.requestSuccess && result.activationSuccess) {
        setActivationStatus('success');
        setActivationMessage('手动激活成功');
        message.success('手动激活成功');
      } else {
        setActivationStatus('error');
        setActivationMessage(result.error || '手动激活失败');
      }
    } catch (err) {
      setActivationStatus('error');
      setActivationMessage((err as Error).message || '手动激活失败');
    }
  };

  const currentStep =
    status === 'idle'
      ? 0
      : status === 'loading'
      ? 1
      : status === 'generating' || status === 'error'
      ? 2
      : 3;
  const missingConditions: string[] = [];
  if (!(manualUrlMode ? objectUrl.trim() : selectedWriteBackObject?.objectUrl)) missingConditions.push('未定位SAP对象');
  if (!targetProgramName.trim()) missingConditions.push('未填写目标程序名');
  if (!generatedProgramName) missingConditions.push('尚未完成代码生成');
  if (precheckEnabled && precheckStatus !== 'success') missingConditions.push('未通过写回前预检查');

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Row gutter={isMobile ? 12 : 16}>
        <Col xs={24} md={12}>
          <Card title="第一步：输入 FS 文档" size="small" style={{ height: '100%' }}>
            <Input
              placeholder="目标程序名称（如 ZMM_NEW_REPORT）"
              value={targetProgramName}
              onChange={(e) => {
                setTargetProgramName(e.target.value.toUpperCase());
                setPrecheckStatus('idle');
                setPrecheckMessage('');
              }}
              style={{ marginBottom: 12 }}
            />
            <TextArea
              placeholder="在此粘贴功能说明书（FS）内容，支持 Markdown 格式..."
              rows={18}
              value={fsContent}
              onChange={(e) => setFsContent(e.target.value)}
              style={{ fontFamily: 'Consolas, monospace', fontSize: 13 }}
            />
            
            {/* Custom Prompt Panel */}
            <div style={{ marginTop: 12 }}>
              <CustomPromptPanel
                enabled={useCustomPrompt}
                customPrompt={customPrompt}
                onEnabledChange={setUseCustomPrompt}
                onPromptChange={setCustomPrompt}
                onOptimizePrompt={handleOptimizePrompt}
                optimizing={optimizing}
                placeholder="定义AI生成ABAP代码的特定要求，如：使用特定的命名规范、包含详细的注释等..."
              />
            </div>

            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              block
              style={{ marginTop: 12 }}
              disabled={!fsContent.trim() || status === 'loading' || status === 'generating'}
              loading={status === 'loading'}
              onClick={handleGenerate}
            >
              生成 ABAP 代码
            </Button>
            {generatedProgramName && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                本次生成绑定程序名：{generatedProgramName}
              </Text>
            )}
            {(status === 'loading' || status === 'generating') && (
              <Button block style={{ marginTop: 8 }} icon={<StopOutlined />} onClick={cancel}>
                停止生成
              </Button>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="生成的 ABAP 代码"
            size="small"
            style={{ height: '100%' }}
            extra={
              displayCode && (
                <ExportButton
                  content={displayCode}
                  filename={targetProgramName || 'abap_code'}
                  showCopy
                />
              )
            }
          >
            {status !== 'idle' && (
              <Steps
                size="small"
                current={currentStep}
                status={status === 'error' ? 'error' : 'process'}
                style={{ marginBottom: 12 }}
                items={[
                  { title: '等待' },
                  { title: '处理中' },
                  { title: '生成中' },
                  { title: '完成' },
                ]}
              />
            )}
            {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
            {displayCode ? (
              <MarkdownPreview
                content={displayCode}
                style={{ maxHeight: isMobile ? '52vh' : 520, overflowY: 'auto' }}
              />
            ) : (
              <div style={{ color: '#747480', textAlign: 'center', padding: '60px 0', borderTop: '3px solid #FFE600' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#FFE600', fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: -1 }}>EY</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>生成的 ABAP 代码将在此处显示</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {displayCode && status === 'done' && (
        <Card title="第二步：写回 SAP 系统（可选）" size="small">
          <div style={{ marginBottom: 12 }}>
            <Space align="center">
              <Text style={{ fontSize: 12 }}>手动输入 URL</Text>
              <Switch
                checked={manualUrlMode}
                onChange={(checked) => {
                  setManualUrlMode(checked);
                  setPrecheckStatus('idle');
                  setPrecheckMessage('');
                }}
                size="small"
              />
            </Space>
            <div style={{ marginTop: 10 }}>
              <Space align="center" style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 12 }}>启用预检查（推荐）</Text>
                <Switch
                  size="small"
                  checked={precheckEnabled}
                  onChange={(checked) => setPrecheckEnabled(checked)}
                />
              </Space>
              <Text style={{ fontSize: 12, marginRight: 8 }}>激活策略</Text>
              <Segmented
                size="small"
                value={activationMode}
                onChange={(value) => {
                  setActivationMode(value as ActivationMode);
                  setActivationStatus('idle');
                  setActivationMessage('');
                }}
                options={[
                  { label: '自动激活', value: 'auto' },
                  { label: '手动激活', value: 'manual' },
                ]}
              />
            </div>
          </div>
          {!manualUrlMode ? (
            <div style={{ marginBottom: 12 }}>
              <ObjectSearchInput
                selectedObject={selectedWriteBackObject}
                onSelect={(obj) => {
                  setSelectedWriteBackObject(obj);
                  setPrecheckStatus('idle');
                  setPrecheckMessage('');
                  if (obj?.name && !targetProgramName.trim()) {
                    setTargetProgramName(obj.name.toUpperCase());
                  }
                }}
              />
              {selectedWriteBackObject && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已选择对象：{selectedWriteBackObject.name}（{selectedWriteBackObject.type}）
                </Text>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <Input
                placeholder="SAP 对象 URL（如 /sap/bc/adt/programs/programs/zmm_xxx）"
                value={objectUrl}
                onChange={(e) => {
                  setObjectUrl(e.target.value);
                  setPrecheckStatus('idle');
                  setPrecheckMessage('');
                }}
              />
            </div>
          )}
          <Row gutter={isMobile ? 8 : 16} align="middle">
            <Col xs={24} md={6}>
              <Input
                placeholder="Transport 编号（可选，如 DEVK900123）"
                value={transportNumber}
                onChange={(e) => setTransportNumber(e.target.value)}
              />
            </Col>
            <Col xs={24} md={4}>
              <Button
                block
                onClick={handlePrecheckWriteBack}
                loading={precheckStatus === 'loading'}
                disabled={
                  !(manualUrlMode ? objectUrl.trim() : selectedWriteBackObject?.objectUrl) ||
                  !targetProgramName.trim() ||
                  !generatedProgramName ||
                  writeBackStatus === 'loading' ||
                  !precheckEnabled
                }
              >
                写回前预检查
              </Button>
            </Col>
            <Col xs={24} md={4}>
              <Button
                type="primary"
                danger
                icon={<CloudUploadOutlined />}
                block
                loading={writeBackStatus === 'loading'}
                disabled={
                  !(manualUrlMode ? objectUrl.trim() : selectedWriteBackObject?.objectUrl) ||
                  !targetProgramName.trim() ||
                  !generatedProgramName ||
                  writeBackStatus === 'loading' ||
                  (precheckEnabled && precheckStatus !== 'success')
                }
                onClick={handleWriteBack}
              >
                写回 SAP 并激活
              </Button>
            </Col>
            <Col xs={24} md={4}>
              {writeBackStatus === 'success' && (
                <Text type="success">✓ 写回成功</Text>
              )}
              {writeBackStatus === 'error' && (
                <Text type="danger">✗ {writeBackError}</Text>
              )}
            </Col>
          </Row>
          {activationMode === 'manual' && writeBackStatus === 'success' && (
            <div style={{ marginTop: 10 }}>
              <Space>
                <Button
                  onClick={handleActivateNow}
                  loading={activationStatus === 'loading'}
                  disabled={activationStatus === 'success'}
                >
                  立即激活
                </Button>
                {activationStatus === 'pending' && <Text type="warning">待手动激活</Text>}
                {activationStatus === 'success' && <Text type="success">✓ 手动激活成功</Text>}
                {activationStatus === 'error' && <Text type="danger">✗ {activationMessage}</Text>}
              </Space>
            </div>
          )}
          {(precheckStatus !== 'idle' || precheckMessage) && (
            <div style={{ marginTop: 10 }}>
              {precheckStatus === 'success' && (
                <Text type="success">✓ 预检查通过</Text>
              )}
              {precheckStatus === 'error' && (
                <Text type="danger">✗ 预检查失败</Text>
              )}
              {precheckMessage && (
                <div style={{ marginTop: 4 }}>
                  <Text type={precheckStatus === 'error' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                    {precheckMessage}
                  </Text>
                </div>
              )}
            </div>
          )}
          {precheckStatus === 'error' && getPrecheckResolution() && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
              message={getPrecheckResolution()!.title}
              description={
                <div>
                  <div style={{ marginBottom: 6 }}>
                    建议处理：{getPrecheckResolution()!.actions.join('；')}
                  </div>
                  <Space wrap>
                    {precheckErrorCode === 'OBJECT_NAME_MISMATCH' && (
                      <Button
                        size="small"
                        onClick={() => {
                          const effectiveUrl = (manualUrlMode ? objectUrl : selectedWriteBackObject?.objectUrl || '').trim();
                          const urlName = extractObjectNameFromUrl(effectiveUrl);
                          if (urlName) {
                            setTargetProgramName(urlName);
                            setPrecheckStatus('idle');
                            setPrecheckMessage('');
                            setPrecheckErrorCode(null);
                            message.success(`已同步程序名为 ${urlName}`);
                          }
                        }}
                      >
                        一键同步程序名
                      </Button>
                    )}
                    {precheckErrorCode === 'OBJECT_URL_INVALID' && (
                      <Button
                        size="small"
                        onClick={() => {
                          setManualUrlMode(false);
                          setPrecheckStatus('idle');
                          setPrecheckMessage('');
                          setPrecheckErrorCode(null);
                        }}
                      >
                        切换到对象搜索
                      </Button>
                    )}
                    <Button size="small" onClick={handlePrecheckWriteBack}>
                      重新预检查
                    </Button>
                  </Space>
                </div>
              }
            />
          )}
          {missingConditions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                写回前置条件：{missingConditions.join('、')}
              </Text>
            </div>
          )}
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            注意：写回操作将直接修改 SAP 系统中的程序源码并激活。请确认程序名称和对象 URL 正确无误。
          </Text>
        </Card>
      )}
    </Space>
  );
}
