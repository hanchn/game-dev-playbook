from __future__ import annotations
import hashlib,json,math,re
from pathlib import Path
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
def get_map_environment(environment_id):
    for item in json.loads((Path(__file__).parent / "environments.json").read_text())["environments"]:
        if item.get("environment_id") == environment_id: return item
    raise ValueError(f"unknown map environment: {environment_id}")

def _unit_hash(seed: int, x: int, y: int, channel: str) -> float:
    digest = hashlib.blake2s(f"{seed}:{x}:{y}:{channel}".encode(), digest_size=8).digest()
    return int.from_bytes(digest, "big") / ((1 << 64) - 1)


def _smooth_noise(seed: int, x: float, y: float, scale: int, channel: str) -> float:
    gx, gy = math.floor(x / scale), math.floor(y / scale)
    tx, ty = (x / scale) - gx, (y / scale) - gy
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a = _unit_hash(seed, gx, gy, channel)
    b = _unit_hash(seed, gx + 1, gy, channel)
    c = _unit_hash(seed, gx, gy + 1, channel)
    d = _unit_hash(seed, gx + 1, gy + 1, channel)
    top, bottom = a + (b - a) * tx, c + (d - c) * tx
    return top + (bottom - top) * ty


def _run_length(values: list[str]) -> list[list[Any]]:
    result: list[list[Any]] = []
    for value in values:
        if result and result[-1][0] == value:
            result[-1][1] += 1
        else:
            result.append([value, 1])
    return result


def generate_world_chunk(
    world_id: str,
    seed: int,
    chunk_x: int,
    chunk_y: int,
    *,
    chunk_size: int = 64,
    environment_id: str = "mortal-temperate",
) -> dict[str, Any]:
    """Generate one deterministic, boundary-safe chunk for a finite or unbounded world."""
    if not ID_RE.fullmatch(world_id):
        raise ValueError("world_id must be a lowercase slug")
    if isinstance(seed, bool) or not isinstance(seed, int) or abs(seed) > 2**53:
        raise ValueError("seed must be an integer within JavaScript's safe range")
    if isinstance(chunk_x, bool) or not isinstance(chunk_x, int) or abs(chunk_x) > 1_000_000:
        raise ValueError("chunk_x must be an integer between -1000000 and 1000000")
    if isinstance(chunk_y, bool) or not isinstance(chunk_y, int) or abs(chunk_y) > 1_000_000:
        raise ValueError("chunk_y must be an integer between -1000000 and 1000000")
    if isinstance(chunk_size, bool) or not isinstance(chunk_size, int) or not 16 <= chunk_size <= 128:
        raise ValueError("chunk_size must be an integer between 16 and 128")
    environment = get_map_environment(environment_id)

    origin_x, origin_y = chunk_x * chunk_size, chunk_y * chunk_size
    materials: list[str] = []
    elevations: list[int] = []
    moisture_values: list[int] = []
    features: list[dict[str, Any]] = []
    decisions: list[dict[str, Any]] = []
    border: dict[str, list[str]] = {"north": [], "east": [], "south": [], "west": []}

    def sample(wx: int, wy: int) -> tuple[str, int, int]:
        height = .68 * _smooth_noise(seed, wx, wy, 48, "height") + .32 * _smooth_noise(seed, wx, wy, 13, "detail")
        moisture = .72 * _smooth_noise(seed, wx, wy, 64, "moisture") + .28 * _smooth_noise(seed, wx, wy, 19, "wet-detail")
        river_center = math.sin(wy * .026 + _smooth_noise(seed, 0, wy, 91, "river") * 5.4) * 18
        river_distance = abs((wx % 192) - 96 - river_center)
        if environment_id == "underwater":
            reef = _smooth_noise(seed, wx, wy, 11, "reef")
            vent = _smooth_noise(seed, wx, wy, 17, "vent")
            if height < .22:
                material = "abyss-silt"
            elif vent > .86 and height < .56:
                material = "hydrothermal"
            elif reef > .62:
                material = "coral"
            elif height > .66:
                material = "seabed-rock"
            else:
                material = "seabed-sand"
        elif environment_id == "ocean-surface":
            material = "deep-water" if height < .58 else "shoal"
        elif environment_id == "inferno":
            material = "lava" if moisture < .24 else "basalt"
        elif environment_id == "underworld":
            material = "ash-soil" if height < .62 else "dark-stone"
        elif river_distance < 2.1 and height < .76:
            material = "fresh-water"
        elif height > .78:
            material = "stone"
        elif moisture < .22:
            material = "sand"
        elif moisture > .72:
            material = "mud"
        else:
            material = "grass"
        return material, round(height * 255), round(moisture * 255)

    for local_y in range(chunk_size):
        for local_x in range(chunk_size):
            wx, wy = origin_x + local_x, origin_y + local_y
            material, elevation, moisture = sample(wx, wy)
            materials.append(material)
            elevations.append(elevation)
            moisture_values.append(moisture)
            chance = _unit_hash(seed, wx, wy, "feature")
            feature_threshold = .989 if environment_id == "underwater" else .996
            if chance > feature_threshold and material not in {"fresh-water", "deep-water", "lava"}:
                if environment_id == "underwater":
                    archetype = {
                        "coral": "coral-garden",
                        "hydrothermal": "hydrothermal-vent",
                        "seabed-rock": "submerged-ruin",
                        "abyss-silt": "abyssal-fauna",
                    }.get(material, "kelp-cluster")
                else:
                    archetype = "rock-outcrop" if elevation > 175 else "tree-broadleaf"
                feature_id = f"{world_id}-{wx}-{wy}"
                features.append({"id": feature_id, "archetype": archetype, "world_x": wx, "world_y": wy,
                                 "variant_seed": round(_unit_hash(seed, wx, wy, "variant") * 1_000_000)})
                if chance > .999:
                    decisions.append({
                        "candidate_id": feature_id,
                        "judge": "jev-compatible",
                        "question": "Choose the narrative function for this generated landmark.",
                        "labels": ["resource", "danger", "shelter", "story", "ordinary"],
                        "fallback": "ordinary",
                        "features": {"environment": environment_id, "material": material,
                                     "elevation": elevation, "moisture": moisture},
                    })

    for offset in range(chunk_size):
        border["north"].append(sample(origin_x + offset, origin_y)[0])
        border["south"].append(sample(origin_x + offset, origin_y + chunk_size - 1)[0])
        border["west"].append(sample(origin_x, origin_y + offset)[0])
        border["east"].append(sample(origin_x + chunk_size - 1, origin_y + offset)[0])

    return {
        "schema_version": 1,
        "world_id": world_id,
        "seed": seed,
        "generator_version": "deterministic-chunks-v1",
        "environment_ref": environment_id,
        "environment_layer": environment.get("space_layer"),
        "chunk": {"x": chunk_x, "y": chunk_y, "size": chunk_size,
                  "origin": {"x": origin_x, "y": origin_y}},
        "surface_encoding": {"order": "row-major", "codec": "rle", "runs": _run_length(materials)},
        "elevation": {"min": min(elevations), "max": max(elevations), "mean": round(sum(elevations) / len(elevations), 2)},
        "moisture": {"min": min(moisture_values), "max": max(moisture_values), "mean": round(sum(moisture_values) / len(moisture_values), 2)},
        "features": features,
        "environment_systems": ({
            "depth_bands": ["sunlight", "twilight", "abyss"],
            "lighting": "depth-attenuated-caustics",
            "traversal": "submarine-3d-currents",
            "ecology": ["coral-garden", "kelp-cluster", "hydrothermal-vent", "abyssal-fauna"],
            "landmarks": ["submerged-ruin"],
        } if environment_id == "underwater" else {}),
        "decision_candidates": decisions,
        "edge_contract": border,
        "persistence": {"base": "regenerate-from-seed", "changes": "store-as-coordinate-patches"},
    }


def world_chunk_to_tiled(chunk: dict[str, Any]) -> dict[str, Any]:
    """Convert our compact chunk contract to Tiled's documented infinite-map JSON shape."""
    info = chunk.get("chunk") if isinstance(chunk, dict) else None
    encoding = chunk.get("surface_encoding") if isinstance(chunk, dict) else None
    if not isinstance(info, dict) or not isinstance(encoding, dict) or encoding.get("codec") != "rle":
        raise ValueError("expected a generated world chunk with RLE surface encoding")
    size = info.get("size")
    if not isinstance(size, int) or not 16 <= size <= 128:
        raise ValueError("invalid generated chunk size")
    material_ids = {"grass": 1, "stone": 2, "sand": 3, "mud": 4, "fresh-water": 5,
                    "deep-water": 6, "shoal": 7, "lava": 8, "basalt": 9,
                    "ash-soil": 10, "dark-stone": 11, "seabed-sand": 12,
                    "seabed-rock": 13, "coral": 14, "abyss-silt": 15,
                    "hydrothermal": 16}
    data: list[int] = []
    for run in encoding.get("runs", []):
        if not isinstance(run, list) or len(run) != 2 or run[0] not in material_ids:
            raise ValueError("invalid surface run")
        count = run[1]
        if isinstance(count, bool) or not isinstance(count, int) or count < 1:
            raise ValueError("invalid surface run length")
        data.extend([material_ids[run[0]]] * count)
    if len(data) != size * size:
        raise ValueError("surface run lengths do not match chunk dimensions")
    origin = info.get("origin", {})
    return {
        "type": "map", "version": "1.10", "tiledversion": "1.12.2",
        "orientation": "orthogonal", "renderorder": "right-down", "infinite": True,
        "tilewidth": 32, "tileheight": 32, "width": 0, "height": 0,
        "layers": [{
            "id": 1, "name": "surface", "type": "tilelayer", "visible": True,
            "opacity": 1, "startx": origin.get("x", 0), "starty": origin.get("y", 0),
            "chunks": [{"x": origin.get("x", 0), "y": origin.get("y", 0),
                        "width": size, "height": size, "data": data}],
        }],
        "tilesets": [{"firstgid": 1, "source": "asset-forge-surface-materials.tsj"}],
        "properties": [
            {"name": "world_id", "type": "string", "value": chunk.get("world_id", "")},
            {"name": "world_seed", "type": "int", "value": chunk.get("seed", 0)},
            {"name": "generator_version", "type": "string", "value": chunk.get("generator_version", "")},
        ],
    }

