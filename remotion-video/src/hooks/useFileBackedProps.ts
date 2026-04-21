import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const normalizeStaticAssetPath = (assetPath: string) => {
  return assetPath.replace(/^\/+/, '').replace(/^public\//, '');
};

export function useFileBackedProps<T extends Record<string, unknown>>(
  inlineProps: T,
  propsFile?: string | null,
) {
  const normalizedPropsFile = React.useMemo(() => {
    return typeof propsFile === 'string' && propsFile.trim()
      ? normalizeStaticAssetPath(propsFile)
      : '';
  }, [propsFile]);
  const inlineSignature = React.useMemo(() => JSON.stringify(inlineProps), [inlineProps]);
  const [resolvedProps, setResolvedProps] = React.useState<T>(inlineProps);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!normalizedPropsFile) {
      setResolvedProps(inlineProps);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    let renderContinued = false;
    const renderHandle = delayRender(`Loading composition props: ${normalizedPropsFile}`);

    (async () => {
      try {
        const response = await fetch(staticFile(normalizedPropsFile));
        if (!response.ok) {
          throw new Error(`Failed to load composition props (${response.status})`);
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        const definedInlineProps = Object.fromEntries(
          Object.entries(inlineProps).filter(([, value]) => value !== undefined),
        ) as Partial<T>;

        setResolvedProps({
          ...(payload && typeof payload === 'object' ? payload : {}),
          ...definedInlineProps,
        });
        setLoadError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (!renderContinued) {
          continueRender(renderHandle);
          renderContinued = true;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (!renderContinued) {
        continueRender(renderHandle);
        renderContinued = true;
      }
    };
  }, [inlineSignature, inlineProps, normalizedPropsFile]);

  return {
    resolvedProps: normalizedPropsFile ? resolvedProps : inlineProps,
    loadError,
  };
}
