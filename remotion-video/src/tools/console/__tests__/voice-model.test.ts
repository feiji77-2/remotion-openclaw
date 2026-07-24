import {describe, expect, it} from 'vitest';
import {audioFromAssetPack, withoutVoiceAudio} from '../StudioApp';

describe('voice asset model', () => {
  const assetPack = {
    productionId: 'demo',
    assets: [
      {id: 'music-bed', kind: 'audio', src: 'projects/demo/audio/music.mp3', required: false},
      {id: 'voiceover', kind: 'audio', src: 'projects/demo/audio/voice.m4a', required: true, source: 'upload'},
      {id: 'cover', kind: 'image', src: 'projects/demo/assets/cover.png', required: false},
    ],
  };

  it('does not mistake music for the narration gate', () => {
    expect(audioFromAssetPack({assets: [assetPack.assets[0]]})).toBeNull();
    expect(audioFromAssetPack(assetPack)).toMatchObject({src: 'projects/demo/audio/voice.m4a', source: 'upload'});
  });

  it('removes only narration while preserving music and visual assets', () => {
    const next = withoutVoiceAudio(assetPack, 'demo');
    expect(next.assets).toEqual([assetPack.assets[0], assetPack.assets[2]]);
  });
});
