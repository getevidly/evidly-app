import { Layout } from '../components/layout/Layout';
import { HelpCenter } from '../components/HelpCenter';
import { VisualWorkflow } from '../components/VisualWorkflow';

export function Help() {
  return (
    <Layout title="Help & Documentation">
      <div className="space-y-8">
        <VisualWorkflow />
        <HelpCenter inline={true} />
      </div>
    </Layout>
  );
}
