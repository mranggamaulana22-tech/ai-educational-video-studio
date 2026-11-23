import cv2, numpy as np
U='/mnt/user-data/uploads/'
names=['happy','concerned','closed','surprised','thinking','a','o','e']
files=['1795320563397','1795320570186','1795320575943','1795320585777','1795320592221','1795320597683','1795320603290','1795320608648']
ref=cv2.imread(U+'1795320550333_image.png'); H,W=ref.shape[:2]
# compare with portrait composite
por=cv2.imread(U+'felisa-panel-portrait.png',cv2.IMREAD_UNCHANGED)
print('ref vs portrait rgb diff', np.abs(ref.astype(int)-por[:,:,:3].astype(int)).mean())
g=lambda im: cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),(0,0),1.5).astype(np.float32)/255
rg=g(ref)
# mask: exclude face/hair-front region so expression doesn't bias alignment
m=np.ones((H,W),np.uint8)*255
cv2.rectangle(m,(150,60),(300,250),0,-1)
out={}
for n,f in zip(names,files):
    im=cv2.imread(U+f+'_image.png'); r=cv2.resize(im,(W,H),interpolation=cv2.INTER_AREA)
    A=np.eye(2,3,dtype=np.float32)
    cc,A=cv2.findTransformECC(rg,g(r),A,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6),m,5)
    w=cv2.warpAffine(r,A,(W,H),flags=cv2.INTER_LINEAR+cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
    cv2.imwrite(f'al_{n}.png',w); out[n]=w
    d=np.abs(w.astype(int)-ref.astype(int)).mean(2)
    print(n,'cc=%.3f'%cc,'A=',np.round(A,3).tolist(),'body diff %.1f'%d[300:500,100:400].mean())
# contact sheet of face crops
crops=[ref[70:250,150:310]]+[out[n][70:250,150:310] for n in names]
row=np.hstack([cv2.resize(c,(240,270)) for c in crops[:5]]); row2=np.hstack([cv2.resize(c,(240,270)) for c in crops[5:]]+[np.zeros((270,240,3),np.uint8)]*(5-len(crops[5:])))
cv2.imwrite('sheet.png',np.vstack([row,row2]))
