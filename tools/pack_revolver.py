# pack the single-action revolver for the game (assets/models/Revolver.glb): the source is the viewer GLB made in another chat for the
# repository owner (Blender export: 34 parts, ten PBR materials, an ambient-occlusion atlas on a second UV set)
# usage: python3 tools/pack_revolver.py source.glb assets/models/Revolver.glb   (needs numpy and Pillow)
#  - the parts that never move are merged into one mesh, one primitive per material ("Body": fewer draw calls); the hammer, the trigger and
#    the cylinder (with its six rounds) stay their own nodes, at their pivots, so the game can cock the hammer, pull the trigger and turn
#    the cylinder (rotation.z for the hammer and trigger, rotation.x for the cylinder)
#  - quantized (KHR_mesh_quantization): int16 positions under each mesh node's offset and uniform scale (uniform, so the lighting's
#    normals aren't bent by it), int8 normals, uint16 normalized AO-atlas UVs (TEXCOORD_1), and int16 normalized texture UVs (TEXCOORD_0):
#    the steel's grain repeats several times along a part, so those run past 0..1; each primitive's "extras" holds uvo/uvs, and the
#    game reads uv = uvo + uvs * value (12v prepRevolver). Nothing else reads this file.
#  - textures at half size, re-encoded as JPEG
import json, struct, io, sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read(); clen = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + clen])
o = 20 + clen; blen = struct.unpack('<I', b[o:o + 4])[0]; BIN = b[o + 8:o + 8 + blen]
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; dt = CT[a['componentType']]; n = NC[a['type']]
    assert not bv.get('byteStride') or bv['byteStride'] == n * np.dtype(dt).itemsize
    return np.frombuffer(BIN, dt, count=a['count'] * n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], n).copy()
nodes = j['nodes']; byname = {n['name']: i for i, n in enumerate(nodes)}
for n in nodes: assert 'rotation' not in n and 'scale' not in n, n['name'] # (the source places every part by translation alone)
T = lambda n: np.array(n.get('translation', [0, 0, 0]), np.float64)
# which moving part each mesh belongs to, and its offset from that part's pivot
MOVING = ['Hammer', 'Trigger', 'Cylinder']; groups = {g: {} for g in ['Body'] + MOVING}
def collect(ni, group, off):
    n = nodes[ni]
    if n['name'] in MOVING: group, off = n['name'], np.zeros(3)
    else: off = off + T(n)
    if 'mesh' in n:
        for p in j['meshes'][n['mesh']]['primitives']:
            P = acc(p['attributes']['POSITION']).astype(np.float64) + off; N = acc(p['attributes']['NORMAL']).astype(np.float64)
            groups[group].setdefault(p['material'], []).append((P, N, acc(p['attributes']['TEXCOORD_0']).astype(np.float64), acc(p['attributes']['TEXCOORD_1']).astype(np.float64), acc(p['indices']).reshape(-1)))
    for c in n.get('children', []): collect(c, group, off)
root = j['scenes'][j.get('scene', 0)]['nodes'][0]; assert nodes[root]['name'] == 'Revolver' and 'translation' not in nodes[root]
for c in nodes[root]['children']: collect(c, 'Body', np.zeros(3))
out = bytearray(); views = []; accs = []
def put(arr, target=None, stride=None):
    while len(out) % 4: out.append(0)
    off = len(out); data = arr.tobytes(); out.extend(data)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: v['target'] = target
    if stride: v['byteStride'] = stride
    views.append(v); return len(views) - 1
meshes, outNodes, tris = [], [], 0
def mesh_node(name, mats):
    global tris
    merged = []
    for mi, parts in sorted(mats.items()):
        base = 0; Ps, Ns, U0, U1, Is = [], [], [], [], []
        for P, N, u0, u1, I in parts: Ps.append(P); Ns.append(N); U0.append(u0); U1.append(u1); Is.append(I.astype(np.int64) + base); base += len(P)
        merged.append((mi, np.concatenate(Ps), np.concatenate(Ns), np.concatenate(U0), np.concatenate(U1), np.concatenate(Is)))
    allP = np.concatenate([m[1] for m in merged]); lo, hi = allP.min(0), allP.max(0); ctr = (lo + hi) / 2; sc = float((hi - lo).max()) / 65532
    prims = []
    for mi, P, N, u0, u1, I in merged:
        q = np.round((P - ctr) / sc).astype(np.int16); q4 = np.zeros((len(q), 4), np.int16); q4[:, :3] = q
        nn = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9); n4 = np.zeros((len(nn), 4), np.int8); n4[:, :3] = np.round(nn * 127).astype(np.int8)
        ulo, uhi = u0.min(0), u0.max(0); uo = (ulo + uhi) / 2; us = np.maximum((uhi - ulo) / 2, 1e-6); uq = np.round((u0 - uo) / us * 32767).astype(np.int16)
        assert u1.min() >= -1e-4 and u1.max() <= 1 + 1e-4; aq = np.round(np.clip(u1, 0, 1) * 65535).astype(np.uint16)
        big = len(P) > 65535; a0 = len(accs)
        accs.append({'bufferView': put(q4, 34962, 8), 'componentType': 5122, 'count': len(q), 'type': 'VEC3', 'min': q.min(0).tolist(), 'max': q.max(0).tolist()})
        accs.append({'bufferView': put(n4, 34962, 4), 'componentType': 5120, 'normalized': True, 'count': len(q), 'type': 'VEC3'})
        accs.append({'bufferView': put(uq, 34962, 4), 'componentType': 5122, 'normalized': True, 'count': len(q), 'type': 'VEC2'})
        accs.append({'bufferView': put(aq, 34962, 4), 'componentType': 5123, 'normalized': True, 'count': len(q), 'type': 'VEC2'})
        accs.append({'bufferView': put(I.astype(np.uint32 if big else np.uint16), 34963), 'componentType': 5125 if big else 5123, 'count': len(I), 'type': 'SCALAR'})
        prims.append({'attributes': {'POSITION': a0, 'NORMAL': a0 + 1, 'TEXCOORD_0': a0 + 2, 'TEXCOORD_1': a0 + 3}, 'indices': a0 + 4, 'material': mi,
                      'extras': {'uvo': [round(float(x), 6) for x in uo], 'uvs': [round(float(x), 6) for x in us]}})
        tris += len(I) // 3
    meshes.append({'name': name + '_geo', 'primitives': prims}) # (named apart from the nodes, so the loader leaves the nodes' names alone)
    outNodes.append({'name': name + '_mesh' if name in MOVING else name, 'mesh': len(meshes) - 1, 'translation': ctr.tolist(), 'scale': [sc, sc, sc]})
    return len(outNodes) - 1
kids = [mesh_node('Body', groups['Body'])]
for g in MOVING:
    m = mesh_node(g, groups[g]); outNodes.append({'name': g, 'translation': T(nodes[byname[g]]).tolist(), 'children': [m]}); kids.append(len(outNodes) - 1)
outNodes.append({'name': 'Revolver', 'children': kids})
# textures: half size, re-encoded
imgs = []
for im in j['images']:
    bv = j['bufferViews'][im['bufferView']]; data = BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    I0 = Image.open(io.BytesIO(data)).convert('RGB'); w, h = I0.size; I0 = I0.resize((w // 2, h // 2), Image.LANCZOS)
    buf = io.BytesIO(); I0.save(buf, 'JPEG', quality=90 if 'normal' in im['name'] else 86, optimize=True, progressive=False)
    imgs.append({'name': im['name'], 'mimeType': 'image/jpeg', 'bufferView': put(np.frombuffer(buf.getvalue(), np.uint8))})
    print(f"{im['name']:16s} {w}x{h} {len(data):8d} -> {w // 2}x{h // 2} {len(buf.getvalue()):7d}")
J = {'asset': {'version': '2.0', 'generator': 'Gallows Gulch tools/pack_revolver.py from the revolver viewer GLB (Blender glTF I/O)'},
     'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
     'scene': 0, 'scenes': [{'nodes': [len(outNodes) - 1]}], 'nodes': outNodes, 'meshes': meshes, 'materials': j['materials'],
     'textures': j['textures'], 'samplers': j['samplers'], 'images': imgs, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(out)}]}
while len(out) % 4: out.append(0)
J['buffers'][0]['byteLength'] = len(out)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(out), b'BIN\x00') + bytes(out)
open(dst, 'wb').write(glb); print('wrote', dst, len(glb), 'bytes;', tris, 'triangles;', sum(len(m['primitives']) for m in meshes), 'primitives')
