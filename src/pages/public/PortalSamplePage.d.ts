/* Types for PortalSamplePage.jsx so App.tsx lazy-loads it without an
 * implicit-any module (TS7016). */
import type { ReactElement } from 'react';

declare function PortalSamplePage(): ReactElement;
export default PortalSamplePage;
