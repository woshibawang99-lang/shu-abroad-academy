from pathlib import Path
from fontTools.ttLib import TTFont
p=Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_003')
f=TTFont(p.parent.parent/'fonts/PDFR_F43.ttf')
family='PDFRT_F43'
n=f['name']
for platform,encoding,lang in [(3,1,0x409),(1,0,0)]:
 for i,value in [(1,family),(2,'Regular'),(3,family+' Regular 1.001'),(4,family),(5,'Version 1.001'),(6,family),(16,family),(17,'Regular')]:
  n.setName(value,i,platform,encoding,lang)
o=f['OS/2'];o.fsSelection=64;o.sFamilyClass=0x0100;o.ulCodePageRange1=1;o.ulCodePageRange2=0;o.achVendID='PDFR';o.sxHeight=500;o.sCapHeight=735
o.ySubscriptXSize=650;o.ySubscriptYSize=600;o.ySubscriptYOffset=75;o.ySuperscriptXSize=650;o.ySuperscriptYSize=600;o.ySuperscriptYOffset=350
o.panose.bFamilyType=2;o.panose.bSerifStyle=2;o.panose.bWeight=5;o.panose.bProportion=2;o.panose.bContrast=5;o.panose.bStrokeVariation=2;o.panose.bArmStyle=2;o.panose.bLetterForm=2;o.panose.bMidline=2;o.panose.bXHeight=4
f['head'].flags=3;f['post'].underlinePosition=-100;f['post'].underlineThickness=50
out=p/'assets/PDFRT_F43.ttf';out.parent.mkdir(exist_ok=True);f.save(out)
print(out)
