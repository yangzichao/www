# Paper thumbnail source

The thumbnail embeds Figure 2 from:

Wael Elkamhawy, Zichao Yang, Hans-Werner Hammer, and Lucas Platter,
"β-delayed proton emission from 11Be in effective field theory,"
*Physics Letters B* **821** (2021), 136610.
[DOI: 10.1016/j.physletb.2021.136610](https://doi.org/10.1016/j.physletb.2021.136610).

The article is © 2021 the authors, published by Elsevier under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), funded by SCOAP3.
[Published PDF](https://scoap3-prod-backend.s3.cern.ch/media/files/64369/10.1016/j.physletb.2021.136610_a.pdf).

The image is a crop of the published figure on page 4. The plot, axis labels,
legend, curves, and uncertainty bands are preserved. The thumbnail adds a title,
the decay reaction, and attribution around the figure; it does not redraw data.

The figure was rendered using Poppler:

```sh
pdftoppm -f 4 -l 4 -r 288 -x 1260 -y 250 -W 990 -H 590 \
  -png -singlefile published-paper.pdf decay-rate-figure
```

The resulting PNG is embedded directly in `thumbnail.svg`, so the thumbnail
does not depend on external image requests.
