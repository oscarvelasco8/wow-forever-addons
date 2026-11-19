import {test} from 'node:test';import assert from 'node:assert/strict';import {publicAssetPath} from '../../server/asset-path.ts';
test('public assets accept bound immutable revision paths and reject foreign paths or extensions',()=>{
 const a='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',rev='33333333-3333-4333-8333-333333333333';
 assert.equal(publicAssetPath(a,id,`${a}/${id}.zip`,'release'),true);assert.equal(publicAssetPath(a,id,`${a}/${id}/${rev}.zip`,'release'),true);
 assert.equal(publicAssetPath(a,id,`${a}/${id}/${rev}.webp`,'image'),true);
 for(const path of [`${id}/${a}/${rev}.png`,`${a}/${id}/../${rev}.png`,`${a}/${id}/${rev}.svg`,`${a}/${id}/invalid.png`])assert.equal(publicAssetPath(a,id,path,'image'),false);
});
