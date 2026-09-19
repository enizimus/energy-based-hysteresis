# Energy-based vector hysteresis model

Documentation and interactive notes on the energy-based (dry-friction pinning) vector hysteresis
model for ferromagnetic materials.

**Site:** https://enizimus.github.io/energy-based-hysteresis/

The `docs/` folder is a dependency-free static site — plain HTML, CSS and ES modules, with KaTeX
vendored in `docs/vendor/` so nothing is fetched from a CDN at view time.

## Sections

| Section | State |
|---|---|
| Model | Interactive panel: mechanical analogy, Weiss cells, the equations, the field plane and the projected loop |
| Parameterization | In preparation |
| Resampling | In preparation |
| Identification | In preparation |

## Running it locally

```sh
cd docs && python3 -m http.server 8000
# then open http://localhost:8000
```

## Publishing

GitHub → *Settings* → *Pages* → Source: **Deploy from a branch** → `main` / `/docs`.
