import { useEffect } from 'react';
import { DEMO_SCENES, PrintWorkbench } from '../demo';

export default function InteractiveWorkbench() {
  const sceneKey = new URLSearchParams(window.location.hash.split('?')[1]).get('scene') || undefined;

  // 窄屏下场景标签是横向滚动的，切换后把当前场景滚到可见位置。
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('.print-tab-custom .ant-tabs-tab-active')
        ?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sceneKey]);

  return <PrintWorkbench key={sceneKey} scenes={DEMO_SCENES} initialSceneKey={sceneKey} />;
}
