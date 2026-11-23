"""Create original demo illustrations. No external image service is required."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUTPUT = Path(__file__).resolve().parent.parent / 'docs' / 'demo'


def generate():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for kind, background in [('crate', '#e4e1d5'), ('laptop', '#dce4e5'), ('tools', '#e4e8dd'), ('chair', '#e1ddd4'), ('camera', '#d9dfda'), ('drill', '#e6dfcd')]:
        image = Image.new('RGB', (900, 650), background)
        d = ImageDraw.Draw(image)
        d.ellipse((225, 490, 730, 570), fill='#c7c9bc')
        if kind == 'crate':
            d.polygon([(270,260),(530,180),(685,275),(435,360)],fill='#c6a376')
            d.polygon([(270,260),(435,360),(435,505),(270,410)],fill='#b58b5e')
            d.polygon([(435,360),(685,275),(685,420),(435,505)],fill='#d8b887')
            for offset in [38,78,118]:
                d.line([(435,360+offset),(685,275+offset)],fill='#bb9869',width=4)
                d.line([(270,260+offset),(435,360+offset)],fill='#9c734c',width=4)
            d.polygon([(393,226),(433,213),(592,309),(551,323)],fill='#485449')
            d.polygon([(551,323),(592,309),(592,459),(551,473)],fill='#485449')
            d.rectangle((461,376,520,413),fill='#f4eddb')
            d.line((473,388,507,388),fill='#8d967e',width=4)
        elif kind == 'laptop':
            d.rounded_rectangle((285,175,635,435),radius=14,fill='#434d52')
            d.rectangle((301,191,619,414),fill='#849ca0')
            d.rectangle((320,210,600,236),fill='#bbc9c7')
            d.rectangle((320,252,397,390),fill='#627c80')
            for y in [260,287,314,341]:d.rounded_rectangle((418,y,577,y+13),radius=3,fill='#aabdbb')
            d.polygon([(285,435),(635,435),(715,510),(200,510)],fill='#a5b1b4')
            d.polygon([(305,446),(617,446),(651,482),(264,482)],fill='#536166')
            d.polygon([(395,485),(523,485),(548,501),(376,501)],fill='#c3ced0')
            d.rounded_rectangle((200,507,715,518),radius=5,fill='#6f7e83')
        elif kind == 'tools':
            d.rounded_rectangle((263,298,650,495),radius=12,fill='#455b48')
            d.rounded_rectangle((252,280,661,333),radius=8,fill='#60785a')
            d.rounded_rectangle((377,235,540,291),radius=10,outline='#40513c',width=18)
            d.rectangle((282,333,310,435),fill='#a4ad9a');d.rectangle((604,333,633,435),fill='#a4ad9a')
            d.rectangle((428,311,482,353),fill='#b7c2a2')
            d.rounded_rectangle((293,183,319,278),radius=6,fill='#a68b54')
            d.rounded_rectangle((264,163,345,203),radius=5,fill='#626f64')
            d.line((595,182,595,274),fill='#6c7c6e',width=13)
            d.rounded_rectangle((584,205,606,271),radius=6,fill='#caaa60')
        elif kind == 'chair':
            d.rounded_rectangle((367,152,559,351),radius=38,fill='#6f8076')
            d.rounded_rectangle((380,164,548,336),radius=30,fill='#82958a')
            d.line((389,244,537,244),fill='#74887b',width=4)
            d.line((454,347,454,397),fill='#59605b',width=16)
            d.rounded_rectangle((329,357,588,406),radius=23,fill='#6c8074')
            d.line((309,304,309,379),fill='#515953',width=11);d.line((600,304,600,379),fill='#515953',width=11)
            d.rounded_rectangle((282,297,348,313),radius=7,fill='#606b60');d.rounded_rectangle((570,297,630,313),radius=7,fill='#606b60')
            d.line((454,405,454,481),fill='#505d55',width=17)
            for end in [(326,519),(399,544),(578,519),(515,543)]:
                d.line((454,476,*end),fill='#58655b',width=11);d.ellipse((end[0]-14,end[1]-10,end[0]+14,end[1]+10),fill='#3c4a41')
        elif kind == 'camera':
            d.rounded_rectangle((271,243,661,466),radius=24,fill='#3e4744')
            d.rounded_rectangle((318,211,416,265),radius=8,fill='#53625a')
            d.rectangle((430,217,543,253),fill='#3e4744')
            d.rectangle((444,228,528,243),fill='#a4aea0')
            d.rounded_rectangle((287,261,367,441),radius=15,fill='#56615a')
            d.ellipse((391,256,612,477),fill='#747e72');d.ellipse((408,273,595,460),fill='#293d37')
            d.ellipse((426,291,577,442),fill='#587d78');d.ellipse((450,315,553,418),fill='#2e4b49')
            d.ellipse((464,321,497,350),fill='#9ab8aa');d.ellipse((622,267,637,282),fill='#cfad6a')
        else:
            d.rounded_rectangle((297,227,590,339),radius=19,fill='#ba934c')
            d.polygon([(359,328),(464,328),(494,463),(390,463)],fill='#c69d51')
            d.rounded_rectangle((365,446,540,492),radius=9,fill='#414d44')
            d.rectangle((530,239,600,329),fill='#5f695c')
            d.rectangle((598,258,653,311),fill='#899080')
            d.line((650,283,735,283),fill='#5b675c',width=11)
            for y in [249,270,291]:d.line((316,y,352,y),fill='#8a7142',width=5)
            d.rounded_rectangle((397,357,446,400),radius=6,fill='#4f594d')
        d.text((33,610),'ZEE LINKS / DEMO ILLUSTRATION',fill='#7e8777',font=ImageFont.load_default(size=15))
        image.save(OUTPUT / f'{kind}.jpg',quality=90)


if __name__ == '__main__':
    generate()
    print(f'Generated six original demo illustrations in {OUTPUT}')
