import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

// Only the parts PayLens draws, so the chart chunk stays small (frontend.md → budget).
echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

export type ChartOption = echarts.EChartsCoreOption;

/**
 * One ECharts chart. Loaded lazily by the screens that need it, never in the first bundle.
 * Hidden from assistive technology: every chart comes with a text summary and a table of the
 * same data (ui.md → Accessibility).
 */
export default function EChart({
  option,
  height = 220,
}: {
  option: ChartOption;
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (element === null) {
      return undefined;
    }
    const chart = echarts.init(element, undefined, { renderer: 'svg' });
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return (
    <div
      ref={container}
      aria-hidden="true"
      className="w-full"
      style={{ height }}
    />
  );
}
