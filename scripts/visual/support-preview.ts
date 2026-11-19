import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from '../../src/app/app';
import { Support } from '../../src/app/features/support/support';

const preview=new URL(location.href).searchParams.get('receipt_preview');
if(preview){
  const sid=preview==='unverified'?'cs_test_missing_preview':'cs_test_receipt_preview';
  sessionStorage.setItem('wfa-support-receipt:cs_test_receipt_preview','fixture.proof');
  history.replaceState(null,'','/apoyar?checkout=return&session_id='+sid);
}

bootstrapApplication(App, { providers: [provideRouter([
  { path: 'apoyar', component: Support }, { path: '**', redirectTo: 'apoyar' },
])] }).catch(() => { throw new Error('Support preview failed.'); });
