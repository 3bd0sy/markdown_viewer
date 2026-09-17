# 📊 Plotly Charts

Interactive, exportable charts powered by Plotly.js.

[← Back to README](../README.md)

---

## Syntax

```plotly
{
  "data": [ ... ],
  "layout": { ... }
}
```

The body must be valid **Plotly JSON**.

---

## Line Chart

```plotly
{
  "data": [
    {"x":[1,2,3,4,5],"y":[10,15,13,17,12],"type":"scatter","mode":"lines+markers"}
  ],
  "layout": {"title":"Monthly Revenue"}
}
```

---

## Bar Chart

```plotly
{
  "data": [{
    "x":["Q1","Q2","Q3","Q4"],
    "y":[120, 180, 150, 210],
    "type":"bar",
    "marker": {"color":["#2563eb","#3b82f6","#60a5fa","#93c5fd"]}
  }],
  "layout": {"title":"Quarterly Sales"}
}
```

---

## Pie Chart

```plotly
{
  "data": [{
    "labels":["Mobile","Desktop","Tablet"],
    "values":[55, 35, 10],
    "type":"pie"
  }]
}
```

---

## Theme Integration

Charts automatically match the current theme:

- `paper_bgcolor` set to `transparent` → inherits background
- Colors adapt on light/dark toggle (`refreshTheme()` in PlotlyService)

---

## Print / Word Export

When exporting:

- Charts are converted to **PNG** images at high DPI
- Theme is forced to **light** for print
- Image is embedded inline with the surrounding text

---

## Tips

- **Keep JSON valid** — trailing commas are not allowed
- For very large datasets, use `type: "scattergl"` (WebGL)
- To share X-axis: `"layout": {"xaxis": {"shared": true}}`

[← Back to README](../README.md)
