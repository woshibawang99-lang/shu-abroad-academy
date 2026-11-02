from pathlib import Path
import pymupdf,json,numpy as np
from PIL import Image
P=Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_004')
pdf=pymupdf.open(r'D:/AAA-SZ/2025_Online distributed optimization algorithm with dynamic regret analysis under unbalanced graphs.pdf')[3]
a=np.asarray(Image.open(P/'source.png').convert('L'))<180
b=np.asarray(Image.open(P/'render/rendered.png').convert('L'))<180
sx=a.shape[1]/pdf.rect.width;sy=a.shape[0]/pdf.rect.height
print('image shapes',a.shape,b.shape)
if a.shape!=b.shape:b=np.asarray(Image.open(P/'render/rendered.png').convert('L').resize((a.shape[1],a.shape[0])))<180
spans=[s for block in pdf.get_text('dict')['blocks'] if 'lines' in block for line in block['lines'] for s in line['spans']]
out=[]
for font in ['t1-gul-regular','t1-gul-regular-italic','t1-gul-bold']:
 candidates=[s for s in spans if s['font']==font and len(s['text'].strip())>=5 and all(c.isalpha() or c in '-., ' for c in s['text'])]
 for s in candidates[:18]:
  x0,y0,x1,y1=s['bbox'];x0=int(x0*sx)-1;x1=int(x1*sx)+1;y0=int(y0*sy)-1;y1=int(y1*sy)+1
  aa=a[y0:y1,x0:x1]
  best=(-1,None,None)
  for dy in range(-7,8):
   for dx in range(-3,4):
    bb=b[y0+dy:y1+dy,x0+dx:x1+dx]
    if aa.shape!=bb.shape:continue
    score=np.logical_and(aa,bb).sum()/max(1,np.logical_or(aa,bb).sum())
    if score>best[0]:best=(score,dx,dy)
  result={'font':font,'text':s['text'],'size':s['size'],'sourcebox':[x0,y0,x1,y1],'iou':round(best[0],3),'dx':best[1],'dy':best[2],'normalized':round(best[2]/(s['size']*sy),4)}
  out.append(result);print(result)
(Path(__file__).parent/'baseline-correlation.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
