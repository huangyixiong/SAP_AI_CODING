// 多语言配置文件

export type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'de-DE';

export interface LocaleMessages {
  appTitle: string;
  aiAssistant: string;
  sapConnected: string;
  sapDisconnected: string;
  user: string;
  client: string;
  host: string;
  language: string;
  lastCheck: string;
  notConfigured: string;
  notChecked: string;
  buildingBetterWorld: string;
  
  // Menu items
  research: string;
  blueprint: string;
  implementation: string;
  meetingAudio: string;
  meetingToFS: string;
  sapToTS: string;
  sapToFS: string;
  fsToCode: string;
  configManagement: string;
  
  // Page titles
  pageMeetingAudio: string;
  pageMeetingToFS: string;
  pageSapToTS: string;
  pageSapToFS: string;
  pageFsToCode: string;
  pageConfig: string;
}

export const locales: Record<Language, LocaleMessages> = {
  'zh-CN': {
    appTitle: 'AI Assistant',
    aiAssistant: 'AI Assistant',
    sapConnected: 'SAP 已连接',
    sapDisconnected: 'SAP 未连接',
    user: '用户',
    client: 'Client',
    host: '主机',
    language: '语言',
    lastCheck: '最后检查',
    notConfigured: '未配置',
    notChecked: '未检查',
    buildingBetterWorld: 'Building a better working world',
    
    // Menu items
    research: '前期调研',
    blueprint: '蓝图计划',
    implementation: '系统实施',
    meetingAudio: '会议纪要智能生成',
    meetingToFS: '需求转功能规格说明书',
    sapToTS: '代码反向工程 - 技术规格书',
    sapToFS: '代码反向工程 - 功能规格书',
    fsToCode: '规格驱动代码生成',
    configManagement: 'SAP配置管理',
    
    // Page titles
    pageMeetingAudio: '会议纪要智能生成',
    pageMeetingToFS: '需求转功能规格说明书',
    pageSapToTS: '代码反向工程 - 技术规格书',
    pageSapToFS: '代码反向工程 - 功能规格书',
    pageFsToCode: '规格驱动代码生成',
    pageConfig: 'SAP配置管理',
  },
  'en-US': {
    appTitle: 'AI Assistant',
    aiAssistant: 'AI Assistant',
    sapConnected: 'SAP Connected',
    sapDisconnected: 'SAP Disconnected',
    user: 'User',
    client: 'Client',
    host: 'Host',
    language: 'Language',
    lastCheck: 'Last Check',
    notConfigured: 'Not configured',
    notChecked: 'Not checked',
    buildingBetterWorld: 'Building a better working world',
    
    // Menu items
    research: 'Research',
    blueprint: 'Blueprint',
    implementation: 'Implementation',
    meetingAudio: 'AI Meeting Minutes',
    meetingToFS: 'Requirements to FS',
    sapToTS: 'Code Reverse Eng. - TS',
    sapToFS: 'Code Reverse Eng. - FS',
    fsToCode: 'Spec-Driven Code Gen',
    configManagement: 'SAP Config Mgmt',
    
    // Page titles
    pageMeetingAudio: 'AI-Powered Meeting Minutes Generation',
    pageMeetingToFS: 'Requirements to Functional Specification',
    pageSapToTS: 'Code Reverse Engineering - Technical Spec',
    pageSapToFS: 'Code Reverse Engineering - Functional Spec',
    pageFsToCode: 'Specification-Driven Code Generation',
    pageConfig: 'SAP Configuration Management',
  },
  'ja-JP': {
    appTitle: 'AIアシスタント',
    aiAssistant: 'AIアシスタント',
    sapConnected: 'SAP接続済み',
    sapDisconnected: 'SAP未接続',
    user: 'ユーザー',
    client: 'クライアント',
    host: 'ホスト',
    language: '言語',
    lastCheck: '最終チェック',
    notConfigured: '未設定',
    notChecked: '未チェック',
    buildingBetterWorld: 'より良い活動世界を構築する',
    
    // Menu items
    research: '事前調査',
    blueprint: 'ブループリント',
    implementation: 'システム実装',
    meetingAudio: '議事録自動生成',
    meetingToFS: '要件から機能仕様書へ',
    sapToTS: 'コード逆解析 - 技術仕様書',
    sapToFS: 'コード逆解析 - 機能仕様書',
    fsToCode: '仕様駆動コード生成',
    configManagement: 'SAP設定管理',
    
    // Page titles
    pageMeetingAudio: 'AI搭載議事録自動生成',
    pageMeetingToFS: '要件から機能仕様書への変換',
    pageSapToTS: 'コード逆エンジニアリング - 技術仕様書',
    pageSapToFS: 'コード逆エンジニアリング - 機能仕様書',
    pageFsToCode: '仕様駆動型コード生成',
    pageConfig: 'SAP設定管理',
  },
  'de-DE': {
    appTitle: 'KI-Assistent',
    aiAssistant: 'KI-Assistent',
    sapConnected: 'SAP Verbunden',
    sapDisconnected: 'SAP Getrennt',
    user: 'Benutzer',
    client: 'Mandant',
    host: 'Host',
    language: 'Sprache',
    lastCheck: 'Letzte Prüfung',
    notConfigured: 'Nicht konfiguriert',
    notChecked: 'Nicht geprüft',
    buildingBetterWorld: 'Eine bessere Arbeitswelt aufbauen',
    
    // Menu items
    research: 'Voruntersuchung',
    blueprint: 'Blueprint',
    implementation: 'Systemimplementierung',
    meetingAudio: 'Protokoll-Generierung',
    meetingToFS: 'Anforderungen zu FS',
    sapToTS: 'Code-Reverse-Eng. - TS',
    sapToFS: 'Code-Reverse-Eng. - FS',
    fsToCode: 'Spezifikationsgetriebene Code-Gen.',
    configManagement: 'SAP-Konfigurationsmanagement',
    
    // Page titles
    pageMeetingAudio: 'KI-gestützte Protokollgenerierung',
    pageMeetingToFS: 'Anforderungen zu Funktionsspezifikation',
    pageSapToTS: 'Code-Reverse-Engineering - Technische Spezifikation',
    pageSapToFS: 'Code-Reverse-Engineering - Funktionsspezifikation',
    pageFsToCode: 'Spezifikationsgetriebene Code-Generierung',
    pageConfig: 'SAP-Konfigurationsmanagement',
  },
};

export const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'de-DE', label: 'Deutsch' },
];
