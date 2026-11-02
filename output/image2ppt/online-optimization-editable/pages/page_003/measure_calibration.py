from PIL import Image
import numpy as np
from pathlib import Path
p=Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_003')
s=Image.open(p/'source.png').convert('RGB');r=Image.open(p/'render/rendered.png').convert('RGB')
print('sizes',s.size,r.size)
r=r.resize(s.size);a=np.array(s);b=np.array(r)
for name,box in [('normal',(95,165,550,190)),('formula',(70,391,580,419))]:
 x0,y0,x1,y1=box
 for label,arr in [('source',a),('render',b)]:
  mask=arr[y0:y1,x0:x1,:].min(2)<170
  ys,xs=np.where(mask)
  print(name,label,(int(xs.min()+x0),int(ys.min()+y0),int(xs.max()+x0),int(ys.max()+y0)))
