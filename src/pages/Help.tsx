import { HelpCenter } from '../components/HelpCenter';
import { VisualWorkflow } from '../components/VisualWorkflow';
import { Breadcrumb } from '../components/Breadcrumb';

export function Help() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Help' }]} />
      <VisualWorkflow />
      <HelpCenter inline={true} />
    </div>
  );
}
