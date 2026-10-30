# pack the ARC-09 laser gun for the game (assets/models/ARC09.glb): the source is the viewer GLB made in another chat by the repository owner
# usage: python3 tools/pack_arc09.py source.glb assets/models/ARC09.glb   (needs numpy and Pillow)
# drops tangents, quantizes the meshes (KHR_mesh_quantization: int16 positions with each node's scale and offset, int8 normals,
# uint16 normalized UVs) and shrinks the textures (base colour, ORM and normal at 1024, emissive at 512, as JPEG)
import json, struct, io, sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read(); clen = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + clen])
o = 20 + clen; blen = struct.unpack('<I', b[o:o + 4])[0]; BIN = b[o + 8:o + 8 + blen]
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; dt = CT[a['componentType']]; n = NC[a['type']]
    stride = bv.get('byteStride', 0); off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); cnt = a['count']
    if stride and stride != n * np.dtype(dt).itemsize:
        raw = np.frombuffer(BIN, np.uint8, count=stride * cnt, offset=off).reshape(cnt, stride)[:, :n * np.dtype(dt).itemsize].copy()
        return raw.view(dt).reshape(cnt, n)
    return np.frombuffer(BIN, dt, count=cnt * n, offset=off).reshape(cnt, n).copy()
out = bytearray(); views = []; accs = []
def put(arr, target=None, stride=None):
    while len(out) % 4: out.append(0)
    off = len(out); data = arr.tobytes(); out.extend(data)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: v['target'] = target
    if stride: v['byteStride'] = stride
    views.append(v); return len(views) - 1
meshes, nodes = [], []
for ni, n in enumerate(j['nodes']):
    if 'mesh' not in n: continue
    m = j['meshes'][n['mesh']]; p = m['primitives'][0]
    P = acc(p['attributes']['POSITION']).astype(np.float64) + np.array(n.get('translation', [0, 0, 0]))
    N = acc(p['attributes']['NORMAL']); UV = acc(p['attributes']['TEXCOORD_0']); I = acc(p['indices']).reshape(-1)
    lo, hi = P.min(0), P.max(0); ctr = (lo + hi) / 2; sc = np.maximum((hi - lo) / 65532, 1e-9)
    q = np.round((P - ctr) / sc).astype(np.int16); q4 = np.zeros((len(q), 4), np.int16); q4[:, :3] = q
    nn = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9); n4 = np.zeros((len(nn), 4), np.int8); n4[:, :3] = np.round(nn * 127).astype(np.int8)
    assert UV.min() >= -1e-4 and UV.max() <= 1 + 1e-4, (m['name'], UV.min(), UV.max())
    uq = np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16)
    a0 = len(accs); accs.append({'bufferView': put(q4, 34962, 8), 'componentType': 5122, 'count': len(q), 'type': 'VEC3', 'min': q.min(0).tolist(), 'max': q.max(0).tolist()})
    accs.append({'bufferView': put(n4, 34962, 4), 'componentType': 5120, 'normalized': True, 'count': len(q), 'type': 'VEC3'})
    accs.append({'bufferView': put(uq, 34962, 4), 'componentType': 5123, 'normalized': True, 'count': len(q), 'type': 'VEC2'})
    accs.append({'bufferView': put(I.astype(np.uint16), 34963), 'componentType': 5123, 'count': len(I), 'type': 'SCALAR'})
    meshes.append({'name': m['name'].replace('_LOD0', ''), 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0 + 1, 'TEXCOORD_0': a0 + 2}, 'indices': a0 + 3, 'material': 0}]})
    nodes.append({'name': n['name'].replace('_LOD0', ''), 'mesh': len(meshes) - 1, 'translation': ctr.tolist(), 'scale': sc.tolist()})
# textures: smaller, re-encoded
size = {'ARC09_BaseColor_2K': (1024, 88), 'ARC09_ORM_2K': (1024, 88), 'ARC09_Normal_OpenGL_2K': (1024, 92), 'ARC09_Emissive_2K': (512, 88)}
imgs = []
for im in j['images']:
    bv = j['bufferViews'][im['bufferView']]; data = BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    px, qual = size[im['name']]; I0 = Image.open(io.BytesIO(data)).convert('RGB').resize((px, px), Image.LANCZOS)
    buf = io.BytesIO(); I0.save(buf, 'JPEG', quality=qual, optimize=True, progressive=False)
    imgs.append({'name': im['name'].replace('_2K', ''), 'mimeType': 'image/jpeg', 'bufferView': put(np.frombuffer(buf.getvalue(), np.uint8))})
    print(im['name'], len(data), '->', len(buf.getvalue()))
mat = dict(j['materials'][0]); mat['name'] = 'M_ARC09'
J = {'asset': {'version': '2.0', 'generator': 'Gallows Gulch pack.py from the ARC-09 MK III viewer GLB'},
     'extensionsUsed': ['KHR_mesh_quantization', 'KHR_materials_emissive_strength'], 'extensionsRequired': ['KHR_mesh_quantization'],
     'scene': 0, 'scenes': [{'nodes': [len(nodes)]}], 'nodes': nodes + [{'name': 'ARC09_MKIII', 'children': list(range(len(nodes)))}],
     'meshes': meshes, 'materials': [mat], 'textures': j['textures'], 'samplers': j.get('samplers', [{}]), 'images': imgs,
     'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(out)}]}
while len(out) % 4: out.append(0)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(out), b'BIN\x00') + bytes(out)
open(dst, 'wb').write(glb); print('wrote', dst, len(glb), 'bytes;', sum(a['count'] for a in accs if a['type'] == 'SCALAR') // 3, 'triangles')
