from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/art/portfolio/lettering'
OUT.mkdir(parents=True,exist_ok=True)
SERIF=TTFont(ROOT/'public/fonts/instrument-serif.woff2')
SANS=TTFont(ROOT/'public/fonts/space-grotesk.woff2')
WORD='Imagination.'
INK='#292923'
DEFS='''<defs>
 <linearGradient id="ivory" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#fffdf3"/><stop offset=".55" stop-color="#f6ecd6"/><stop offset="1" stop-color="#d5c5a7"/></linearGradient>
 <linearGradient id="gold" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff1a5"/><stop offset=".5" stop-color="#efce6b"/><stop offset="1" stop-color="#bb8f38"/></linearGradient>
 <linearGradient id="lilac" x1=".15" y1="0" x2=".8" y2="1"><stop stop-color="#e6dff8"/><stop offset=".35" stop-color="#c5b8e3"/><stop offset="1" stop-color="#8c79b1"/></linearGradient>
 <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e2f0ee"/><stop offset=".45" stop-color="#b5d3d2"/><stop offset="1" stop-color="#6e999b"/></linearGradient>
 <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#292923" opacity=".22"/></pattern>
</defs>'''

def star(x,y,r=14,fill='#f2d479',stroke=INK):
 return f'<path d="M{x},{y-r} Q{x+2},{y-2} {x+r},{y} Q{x+2},{y+2} {x},{y+r} Q{x-2},{y+2} {x-r},{y} Q{x-2},{y-2} {x},{y-r}Z" fill="{fill}" stroke="{stroke}" stroke-width="2.4" stroke-linejoin="round"/>'

def letter_paths(font,size,start=44,baseline=166,spacing=-2):
 gs=font.getGlyphSet();cmap=font.getBestCmap();scale=size/font['head'].unitsPerEm;x=start;result=[]
 for char in WORD:
  name=cmap[ord(char)];p=SVGPathPen(gs);gs[name].draw(TransformPen(p,(scale,0,0,-scale,x,baseline)))
  width=font['hmtx'][name][0]*scale
  result.append((char,x,width,p.getCommands()))
  x+=width+spacing
 return result

def svg(name,body):
 (OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 235" fill="none">{DEFS}{body}</svg>',encoding='utf8')

letters=letter_paths(SERIF,166,start=45,baseline=167,spacing=-2)
parts=[]
for i,(char,x,w,d) in enumerate(letters):
 if char=='.':continue
 special=i in [0,3,9]
 if special:
  parts.append(f'<path d="{d}" transform="translate(7 8)" fill="#a4977f" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
  face='ivory' if i in [0,9] else 'gold'
  parts.append(f'<path d="{d}" fill="url(#{face})" stroke="{INK}" stroke-width="2.8" stroke-linejoin="round"/>')
 else:
  parts.append(f'<path d="{d}" transform="translate(2 3)" fill="#292923" opacity=".09"/><path d="{d}" fill="{INK}"/>')
 if i==0:
  parts.append(f'<path d="M{x+10},59 l17,-5 -8,16Z" fill="#fffdf4" stroke="{INK}" stroke-width="1.4"/>')
 if i==3:
  parts.append(f'<path d="M{x+8},188 q19,14 38,-3 l-4,12 q-21,14 -35,-1Z" fill="#d2a950" stroke="{INK}" stroke-width="2"/><path d="M{x+13},190 q14,6 26,-1" stroke="#fff0ba" stroke-width="2"/>')
 if i==8:
  parts.append(star(x+w*.67,58,11))
 if i==9:
  parts.append(f'<path d="M{x+w*.64},98 q10,9 5,25" stroke="#fffdf8" stroke-width="3.5" stroke-linecap="round"/>')
px=letters[-1][1]+16
parts.append(f'<ellipse cx="{px+6}" cy="177" rx="17" ry="4" fill="{INK}" opacity=".12"/><circle cx="{px}" cy="159" r="12" fill="{INK}"/><circle cx="{px-4}" cy="155" r="3" fill="#eee8d7"/>')
parts.append(star(23,91,9,fill='#f6f5f1'))
parts.append('<path d="M819 95 l10 -8 M827 112 l12 -1 M797 78 l2 -11" stroke="#292923" stroke-width="2.6" stroke-linecap="round"/>')
svg('sculpted', ''.join(parts))

parts=[]
for i,(char,x,w,d) in enumerate(letters):
 if char=='.':continue
 face={0:'ivory',1:'lilac',3:'gold',7:'gold',9:'blue'}.get(i)
 if face:
  parts.append(f'<path d="{d}" transform="translate(6 9)" fill="{INK}" opacity=".15"/>')
  parts.append(f'<path d="{d}" fill="url(#{face})" stroke="{INK}" stroke-width="{2 if i!=1 else 1.4}" stroke-linejoin="round"/>')
  if i==1:
   parts.append(f'<path d="M{x+23} 105 q13 -27 27 -15 M{x+68} 95 q13 -18 23 -4" stroke="#fffafc" stroke-width="4" stroke-linecap="round" opacity=".75"/>')
  if i==0:
   parts.append(f'<path d="M{x+11} 58 l17 -3 -4 15Z" fill="#fffdf7" stroke="{INK}" stroke-width="1.5"/>')
  if i==7:
   parts.append(f'<path d="M{x+8} 164 l8 18 12 -17" fill="#e0c09a" stroke="{INK}" stroke-width="1.6"/><path d="M{x+16} 182 l3 -7 3 4Z" fill="{INK}"/><path d="M{x+30} 80 l4 -18 8 1 -4 17" fill="#d8a0a0" stroke="{INK}" stroke-width="1.5"/>')
  if i==9:
   parts.append(f'<path d="M{x+w*.58} 98 q13 11 6 26" stroke="#f7ffff" stroke-width="4" stroke-linecap="round"/>')
 else:parts.append(f'<path d="{d}" fill="{INK}"/>')
 if i==4:parts.append(star(x+w*.65,58,11,fill='#f3d57b'))
parts.append(f'<circle cx="{px}" cy="159" r="11" fill="url(#lilac)" stroke="{INK}" stroke-width="2"/>')
parts.append('<path d="M23 135 q-14 -15 2 -22 q-1 -16 15 -12" stroke="#777164" stroke-width="2" stroke-linecap="round"/><path d="M809 91 l8 -11 M823 104 l12 -3" stroke="#292923" stroke-width="2.5" stroke-linecap="round"/>')
svg('objects',''.join(parts))

comic=letter_paths(SANS,124,start=53,baseline=161,spacing=-.5)
parts=['<path d="M660 174 q78 7 142 -6 l-3 23 q-74 17 -144 -3Z" fill="url(#dots)"/>']
angles=[-5,-2,3,-3,3,-2,1,4,-3,2,-2,0]
ys=[-5,3,-1,8,-4,1,-2,-7,1,2,-3,0]
for i,(char,x,w,d) in enumerate(comic):
 if char=='.':continue
 transform=f'translate(0 {ys[i]}) rotate({angles[i]} {x+w/2} 125)'
 face='gold' if i in [0,3,8] else 'ivory'
 parts.append(f'<g transform="{transform}"><path d="{d}" transform="translate(8 10)" fill="{INK}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><path d="{d}" fill="url(#{face})" stroke="{INK}" stroke-width="5" paint-order="stroke" stroke-linejoin="round"/></g>')
 if i==8:parts.append(star(x+w*.52,65,11,fill='#f3d57b'))
parts.append('<path d="M30 114 l-11 -4 M38 90 l-7 -11 M41 141 l-14 5 M822 94 l10 -10 M835 115 l14 -2" stroke="#292923" stroke-width="3.2" stroke-linecap="round"/>')
parts.append(star(780,39,12,fill='#f3d57b'))
parts.append(f'<circle cx="{comic[-1][1]+12}" cy="158" r="10" fill="{INK}"/>')
svg('comic',''.join(parts))
for name in ['sculpted', 'objects', 'comic']:
 source=(OUT/f'{name}.svg').read_text(encoding='utf8')
 (OUT/f'{name}-dark.svg').write_text(source.replace('fill="#292923"/>', 'fill="#f1efe8"/>'),encoding='utf8')
print('Generated',*[p.name for p in OUT.glob('*.svg')])
