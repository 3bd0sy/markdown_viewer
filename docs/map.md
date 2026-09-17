## 📄 `docs/maps.md`

`````markdown
# 🗺️ Maps

Embed interactive OpenStreetMap tiles.

[← Back to README](../README.md)

---

## Syntax

````markdown
```map
latitude, longitude, zoom
```
````
`````

- **latitude**: -90 to 90
- **longitude**: -180 to 180
- **zoom**: 1 (world) to 19 (street)

---

## Examples

### Istanbul

````markdown
```map
41.015, 28.979, 13
```
````

### Riyadh

````markdown
```map
24.7136, 46.6753, 12
```
````

### Cairo

````markdown
```map
30.0444, 31.2357, 12
```
````

---

## Features

- Full OSM tile rendering
- Pan / zoom controls
- No API key required
- Lightweight — loads only when a `map` block is present
- Prints as a static snapshot

[← Back to README](../README.md)

```

```
