import cv2, numpy as np, os
U='/mnt/user-data/uploads/'
ref=cv2.imread(U+'1795320550333_image.png'); H,W=ref.shape[:2]
names=['happy','concerned','closed','surprised','thinking','a','o','e']
SS=4
def poly_mask(pts):
    m=np.zeros((H*SS,W*SS),np.uint8)
    cv2.fillPoly(m,[np.round(np.array(pts,np.float32)*SS).astype(np.int32)],255)
    return cv2.resize(m,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255
FACE=[(171,153),(173,165),(177,185),(182,200),(190,217),(205,233),(223,241),(238,239),(257,222),(272,203),(279,182),(282,160),(281,147),(272,131),(263,103),(247,90),(223,85),(203,94),(187,112),(176,132)]
m0=poly_mask(FACE)
m0=cv2.erode(m0,np.ones((3,3),np.uint8))
mask=cv2.GaussianBlur(m0,(0,0),3.2)
band=((mask>0.5)&(cv2.erode((mask>0.5).astype(np.uint8),np.ones((17,17),np.uint8))==0))
# eyes mask (for blink patch)
meta={"L":((188,152),12.5,5.2,5),"R":((248,146),14.5,6.6,-8)}
em=np.zeros((H*SS,W*SS),np.uint8)
for k,(c,rx,ry,t) in meta.items():
    cv2.ellipse(em,(int(c[0]*SS),int(c[1]*SS)),(int(rx*1.7*SS),int(ry*3.3*SS)),t,0,360,255,-1)
emask=cv2.GaussianBlur(cv2.resize(em,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255,(0,0),2.2)
emask=np.minimum(emask,mask)
os.makedirs('out',exist_ok=True)
def colormatch(p):
    q=p.astype(np.float32); r=ref.astype(np.float32)
    for c in range(3):
        mp,sp=q[...,c][band].mean(),q[...,c][band].std()+1e-3
        mr,sr=r[...,c][band].mean(),r[...,c][band].std()+1e-3
        g=np.clip(sr/sp,0.9,1.1)
        q[...,c]=(q[...,c]-mp)*g+mr
    return np.clip(q,0,255).astype(np.uint8)
def save(name,img,m):
    rgba=np.dstack([img,(m*255).round().astype(np.uint8)])
    x0,x1=150,305; y0,y1=70,255
    cv2.imwrite(f'out/e_{name}.png',rgba,[cv2.IMWRITE_PNG_COMPRESSION,9])
for n in names:
    a=cv2.imread(f'al_{n}.png'); a=colormatch(a)
    save(n,a,mask)
    if n=='closed': save('eyes',a,emask)
    print(n,os.path.getsize(f'out/e_{n}.png'))
# preview composite of each patch over ref
tiles=[]
for n in names:
    p=cv2.imread(f'out/e_{n}.png',cv2.IMREAD_UNCHANGED); a=p[...,3:4]/255.
    comp=(p[...,:3]*a+ref*(1-a)).astype(np.uint8)
    tiles.append(cv2.resize(comp[70:255,150:310],(240,278)))
cv2.imwrite('comp.png',np.vstack([np.hstack(tiles[:4]),np.hstack(tiles[4:])]))
