import { AngularNodeAppEngine } from '@angular/ssr/node';

const engine = new AngularNodeAppEngine();
/** Only the route is accepted; no caller cookies, headers or credentials enter SSR. */
export async function renderPage(path: string): Promise<Response | null> {
  return engine.handle(new Request(`http://localhost${path}`));
}
