import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, random, Easing} from 'remotion';
import cues from '../public/cues.json';

const fontFamily = 'FredokaLocal, Arial Rounded MT Bold, sans-serif';
const face = new FontFace('FredokaLocal', `url(${staticFile('fredoka.woff2')})`, {weight: '300 700'});
face.load().then((f) => document.fonts.add(f)).catch(() => {});
const IMG = 1254;           // source image size
const TIN = 960;            // rendered tin size (px)
const K = TIN / IMG;
const TIN_CX = 540, TIN_CY = 930;   // tin centre on canvas
const LID_CUT = 350 / IMG;          // y where lid ends

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const sec = (s: number, fps: number) => Math.round(s * fps);

// Circle crop of the tin image around (cx,cy) in source coords, radius r
const Crop: React.FC<{cx: number; cy: number; r: number; size: number; style?: React.CSSProperties}> = ({cx, cy, r, size, style}) => {
  const w = (IMG * size) / (2 * r);
  return (
    <div style={{width: size, height: size, borderRadius: '50%', overflow: 'hidden', position: 'relative', border: '10px solid #fff', boxShadow: '0 20px 50px rgba(0,0,0,.25)', background: '#fff', ...style}}>
      <Img src={staticFile('tin.png')} style={{position: 'absolute', width: w, height: w, left: size / 2 - (cx / IMG) * w, top: size / 2 - (cy / IMG) * w, maxWidth: 'none'}} />
    </div>
  );
};

const Pill: React.FC<{text: string; x: number; y: number; start: number; color: string; rot?: number}> = ({text, x, y, start, color, rot = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - start, fps, config: {damping: 11, stiffness: 120}});
  const bob = Math.sin((f + x) / 14) * 8;
  const fromX = TIN_CX, fromY = TIN_CY;
  const cx = interpolate(p, [0, 1], [fromX, x]);
  const cy = interpolate(p, [0, 1], [fromY, y]) + bob * p;
  return (
    <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%,-50%) scale(${p}) rotate(${rot}deg)`, opacity: Math.min(1, p * 2),
      background: color, color: '#4b2e6b', fontFamily, fontWeight: 700, fontSize: 52, padding: '16px 38px', borderRadius: 60, border: '6px solid #fff', boxShadow: '0 14px 30px rgba(0,0,0,.22)', whiteSpace: 'nowrap'}}>{text}</div>
  );
};

const Sparkles: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({length: 26}).map((_, i) => {
        const x = random(`x${i}`) * 1080, size = 14 + random(`s${i}`) * 40;
        const y = ((random(`y${i}`) * 2200 - f * (0.8 + random(`v${i}`) * 1.6)) % 2200 + 2200) % 2200 - 150;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,.55)'}} />;
      })}
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  // Tin entrance + gentle float + scale per scene
  const enter = spring({frame: f - 4, fps, config: {damping: 9, stiffness: 90}});
  const float = Math.sin(f / 22) * 10;
  const tinScale = interpolate(t, [0, 3, 6, 11, 16, 21, 24, 30], [1, 1, 0.78, 0.7, 0.72, 0.78, 1, 1.04], {...clamp, easing: Easing.inOut(Easing.ease)});
  const tinY = interpolate(t, [0, 3, 6, 11, 16, 21, 24], [0, 0, 120, 160, 150, 120, 0], {...clamp, easing: Easing.inOut(Easing.ease)});

  // Lid: lifts around 3.0s, floats, returns ~22.5s
  const lidUp = spring({frame: f - sec(3.2, fps), fps, config: {damping: 10, stiffness: 70}});
  const lidDown = spring({frame: f - sec(22.4, fps), fps, config: {damping: 14, stiffness: 80}});
  const lid = lidUp - lidDown;
  const lidY = -lid * 330 + Math.sin(f / 15) * 10 * lid;
  const lidRot = lid * -14;

  // Background colour shifts by scene
  const bgA = interpolate(t, [0, 11, 21, 30], [0, 1, 2, 3], clamp);
  const palettes = [['#f4f9c9', '#d9ec5a'], ['#ffe9f1', '#ffb7d0'], ['#e8f3ff', '#a5d8f5'], ['#fff3c9', '#ffd166']];
  const i0 = Math.min(3, Math.floor(bgA)), i1 = Math.min(3, i0 + 1), m = bgA - i0;
  const mix = (a: string, b: string) => {
    const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16)), pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * m)).join(',')})`;
  };

  const sunP = spring({frame: f - sec(16.4, fps), fps, config: {damping: 8, stiffness: 100}});
  const sunOut = interpolate(t, [20, 21], [1, 0], clamp);
  const oatP = spring({frame: f - sec(3.6, fps), fps, config: {damping: 10, stiffness: 90}});
  const oatOut = interpolate(t, [6, 6.8], [1, 0], clamp);

  const finalT = interpolate(t, [24, 25], [0, 1], clamp);
  const cue = cues.find((c) => t >= c.start - 0.1 && t <= c.end + 0.3);

  return (
    <AbsoluteFill style={{background: `linear-gradient(160deg, ${mix(palettes[i0][0], palettes[i1][0])}, ${mix(palettes[i0][1], palettes[i1][1])})`, fontFamily}}>
      <Sparkles />
      <Audio src={staticFile('music.wav')} volume={(fr) => 0.22 * interpolate(fr, [0, 30, 810, 899], [0, 1, 1, 0], clamp)} />
      <Audio src={staticFile('voice.wav')} volume={1} />

      {/* Tin: body + lid cut from the same still, so assembled = approved hero still */}
      <div style={{position: 'absolute', left: TIN_CX - TIN / 2, top: TIN_CY - TIN / 2 + tinY + float, width: TIN, height: TIN,
        transform: `scale(${tinScale * (0.4 + 0.6 * enter)})`, opacity: Math.min(1, enter * 1.5), filter: 'drop-shadow(0 40px 40px rgba(60,40,90,.35))'}}>
        <Img src={staticFile('tin.png')} style={{position: 'absolute', width: TIN, height: TIN, clipPath: `inset(${LID_CUT * 100}% 0 0 0)`}} />
        <Img src={staticFile('tin.png')} style={{position: 'absolute', width: TIN, height: TIN, clipPath: `inset(0 0 ${(1 - LID_CUT) * 100}% 0)`, transform: `translateY(${lidY}px) rotate(${lidRot}deg)`, transformOrigin: '50% 70%'}} />
      </div>

      {/* Scene 2: oat + scoop pops out of the tin */}
      <Sequence from={sec(3.4, fps)} durationInFrames={sec(3.6, fps)}>
        <div style={{position: 'absolute', left: 540 - 230, top: 520 - interpolate(oatP, [0, 1], [-200, 0]), transform: `scale(${oatP * oatOut}) rotate(${(1 - oatP) * 40}deg)`}}>
          <Crop cx={510} cy={765} r={165} size={460} />
        </div>
      </Sequence>
      <Sequence from={sec(3.4, fps)} durationInFrames={sec(3.4, fps)}>
        <Pill text="Tasty Oatmik" x={540} y={1560} start={0} color="#ff7aa8" />
      </Sequence>

      {/* Scene 3: organic trio */}
      <Sequence from={sec(6.0, fps)} durationInFrames={sec(5.4, fps)}>
        <Pill text="Organic Fibrepre Oat" x={540} y={400} start={0} color="#fff6d6" rot={-4} />
        <Pill text="Organic Soy" x={230} y={1500} start={14} color="#e3f4c0" rot={3} />
        <Pill text="Organic Quinoa" x={800} y={1590} start={28} color="#ffe0b8" rot={-3} />
      </Sequence>

      {/* Scene 4: nutrient ring */}
      <Sequence from={sec(11.0, fps)} durationInFrames={sec(5.6, fps)}>
        <Pill text="DHA" x={200} y={420} start={0} color="#fff" rot={-6} />
        <Pill text="GABA" x={850} y={470} start={10} color="#e3f4c0" rot={5} />
        <Pill text="Lysine" x={180} y={1480} start={20} color="#ffe0b8" rot={4} />
        <Pill text="Lutein" x={880} y={1500} start={30} color="#d9ecff" rot={-5} />
        <Pill text="High Calcium" x={540} y={1650} start={40} color="#ffd1e3" />
        <Pill text="Inulin & Postbiotics" x={540} y={330} start={50} color="#f2e1ff" rot={-2} />
      </Sequence>

      {/* Scene 5: sun + suitable for kids */}
      <div style={{position: 'absolute', left: 540 - 200, top: 330, transform: `scale(${sunP * sunOut}) rotate(${(1 - sunP) * -60 + Math.sin(f / 12) * 4}deg)`}}>
        <Crop cx={825} cy={830} r={130} size={400} />
      </div>
      <Sequence from={sec(16.6, fps)} durationInFrames={sec(4.6, fps)}>
        <Pill text="Suitable for Kids" x={540} y={1530} start={0} color="#fff" />
        <Pill text="Aged 1 and above" x={540} y={1650} start={16} color="#ffe27a" />
      </Sequence>

      {/* Scene 6: closing */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 160, textAlign: 'center', opacity: finalT, transform: `translateY(${(1 - finalT) * 40}px)`}}>
        <div style={{fontSize: 70, fontWeight: 700, color: '#5a3a1a', padding: '0 70px', lineHeight: 1.15}}>Nutrition Drink for Better Performance</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 190, textAlign: 'center', opacity: finalT, fontSize: 54, fontWeight: 700, color: '#8a5a9a'}}>Tasty Oatmik · Net Weight 500g</div>

      {/* Captions from the narration script */}
      {cue && t < 24 ? (
        <div style={{position: 'absolute', left: 60, right: 60, bottom: 70, textAlign: 'center', fontSize: 44, fontWeight: 600, color: '#fff', textShadow: '0 3px 12px rgba(0,0,0,.55)'}}>{cue.text}</div>
      ) : null}
    </AbsoluteFill>
  );
};
