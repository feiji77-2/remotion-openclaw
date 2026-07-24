import React, {useEffect, useState} from 'react';
import {loadVideoLibrary} from './api';
import type {VideoLibraryRecord} from './types';

interface VideoLibraryProps {onBack: () => void; onOpenProject: (projectId: string) => void;}

const statusLabel = (record: VideoLibraryRecord) => {
  if (record.status === 'downloadable') return '已生成，可下载';
  if (record.status === 'verification-failed') return '视频文件有问题，暂时不能下载';
  return '已生成，可播放';
};

export const VideoLibrary: React.FC<VideoLibraryProps> = ({onBack, onOpenProject}) => {
  const [records, setRecords] = useState<VideoLibraryRecord[]>([]);
  const [selected, setSelected] = useState<VideoLibraryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyRecords = (items: VideoLibraryRecord[]) => {
    setRecords(items);
    setSelected((current) => items.find((item) => item.id === current?.id) ?? items[0] ?? null);
  };

  useEffect(() => {
    let mounted = true;
    void loadVideoLibrary()
      .then((items) => {if (mounted) { applyRecords(items); setError(null); }})
      .catch((caught) => {if (mounted) setError(caught instanceof Error ? caught.message : '视频库读取失败');})
      .finally(() => {if (mounted) setLoading(false);});
    return () => {mounted = false;};
  }, []);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      applyRecords(await loadVideoLibrary());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '视频库刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  return <section className="library-screen">
    <header className="library-header"><div><button type="button" className="text-action" onClick={onBack}>← 工作台</button><span className="workspace-kicker">VIDEO LIBRARY</span><h1>视频库</h1><p>已完成渲染的成片会在这里保留。只有确认可交付的版本可以下载。</p></div><button type="button" className="secondary-action" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? '刷新中' : '刷新'}</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {loading && <div className="library-empty">正在读取成片记录</div>}
    {!loading && !error && records.length === 0 && <div className="library-empty"><strong>还没有成片</strong><span>完成一次渲染后，成片会自动出现在这里。</span></div>}
    {!loading && records.length > 0 && <div className="library-layout">
      <div className="library-gallery">{records.map((record) => <button key={record.id} type="button" className={`library-tile ${selected?.id === record.id ? 'is-selected' : ''}`} onClick={() => setSelected(record)}><video src={record.playbackUrl} muted loop playsInline preload="metadata" /><span><strong>{record.projectTitle}</strong><small>{statusLabel(record)}</small></span></button>)}</div>
      {selected && <article className="library-detail"><video className="library-player" src={selected.playbackUrl} controls playsInline /><div className="library-detail__meta"><div><span className="workspace-kicker">SELECTED OUTPUT</span><h2>{selected.projectTitle}</h2><p>{statusLabel(selected)}</p>{selected.failureMessage && <div className="notice notice--error">{selected.failureMessage}</div>}</div><div className="library-actions"><button type="button" className="secondary-action" onClick={() => onOpenProject(selected.projectId)}>打开项目</button>{selected.downloadAllowed && selected.downloadUrl ? <a className="download-action" href={selected.downloadUrl}>下载 MP4</a> : <span className="download-disabled">下载暂不可用</span>}</div></div></article>}
    </div>}
  </section>;
};
