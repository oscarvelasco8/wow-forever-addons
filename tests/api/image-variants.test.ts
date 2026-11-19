import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { optimizeImage,boundedImage } from '../../server/image-variants.ts';
test('native image variants reduce dimensions and bytes, strip metadata and never enlarge',async()=>{
  const raw=Buffer.alloc(1600*1000*3);for(let n=0;n<raw.length;n++){raw[n]=(n*37+Math.floor(n/13))%256;}
  const original=await sharp(raw,{raw:{width:1600,height:1000,channels:3}}).png().toBuffer();
  const thumb=await optimizeImage(original,'thumb'),metadata=await sharp(thumb).metadata();
  assert.equal(metadata.format,'webp');assert.equal(metadata.width,320);assert.equal(metadata.height,200);assert.ok(thumb.length<original.length);
  const small=await sharp({create:{width:10,height:20,channels:3,background:'#123456'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const result=await sharp(await optimizeImage(small,'display')).metadata();assert.equal(result.width,20);assert.equal(result.height,10);assert.equal(result.exif,undefined);
  console.log(JSON.stringify({sampleOriginalBytes:original.length,sampleThumbnailBytes:thumb.length,originalDimensions:'1600x1000',thumbnailDimensions:'320x200'}));
});
test('image decoding and streaming enforce input limits and reject non-raster sources',async()=>{
  await assert.rejects(optimizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),'thumb'));
  await assert.rejects(optimizeImage(Buffer.from([137,80,78,71,13,10,26,10]),'thumb'));
  const wide=await sharp({create:{width:8193,height:1,channels:3,background:'#123456'}}).png().toBuffer();await assert.rejects(optimizeImage(wide,'thumb'));
  await assert.rejects(boundedImage(new Response('small',{headers:{'content-length':String(6*1024*1024)}})));
  const tooLarge=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5*1024*1024+1));controller.close();}});
  await assert.rejects(boundedImage(new Response(tooLarge)));
});
