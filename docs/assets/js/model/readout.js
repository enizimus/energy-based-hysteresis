/* Live numbers: the chips under the equations, the state table (the table view
 * of both plots), and the two static legends. */

import { palette } from './palette.js';
import { MS } from './engine.js';
import { M_SCALE } from './vectorplot.js';

const SUB = ['₁', '₂', '₃'];
const STATUS = { stick: 'stick', limit: 'at limit', slip: 'slipping' };

export function createReadout({ chips, rows, foot, legendField, legendLoop }) {
  buildLegends(legendField, legendLoop);
  let built = false;
  const chipEls = [], rowEls = [];

  function build(d) {
    chips.replaceChildren();
    rows.replaceChildren();
    d.cells.forEach((c, k) => {
      const chip = node('span', 'chip');
      chip.append(node('i', 'dot'), node('b'), txt(' '), node('span', 'val'), node('span', 'state'));
      chip.querySelector('.dot').style.background = `var(--c${k + 1})`;
      chips.appendChild(chip);
      chipEls[k] = chip;

      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="cell-name"><i class="sw sw-${k + 1}"></i>Cell ${k + 1}</span></td>`
        + '<td></td>'.repeat(6) + '<td><span class="tag"></span></td>';
      rows.appendChild(tr);
      rowEls[k] = tr;
    });
    const total = node('span', 'chip');
    total.append(node('i', 'dot'), node('b'), txt(' '), node('span', 'val'));
    total.querySelector('.dot').style.background = 'var(--cm)';
    chips.appendChild(total);
    chipEls.push(total);

    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8"></td>';
    foot.replaceChildren(tr);
    rowEls.push(tr);
    built = true;
  }

  return {
    render(d) {
      if (!built) build(d);
      palette();
      d.cells.forEach((c, k) => {
        const chip = chipEls[k];
        chip.querySelector('b').textContent = `κ${SUB[k]} ${c.kappa.toFixed(2)}`;
        chip.querySelector('.val').textContent = `‖Hᵢ‖ ${c.hiMag.toFixed(2)}`;
        const st = chip.querySelector('.state');
        st.textContent = STATUS[c.status];
        st.className = `state ${c.status === 'stick' ? '' : 'slip'}`;

        const td = rowEls[k].children;
        td[1].textContent = c.kappa.toFixed(2);
        td[2].textContent = `${(c.w * 100).toFixed(0)}%`;
        td[3].textContent = c.hrMag.toFixed(3);
        td[4].textContent = c.hiMag.toFixed(3);
        td[5].textContent = (c.mMag / MS).toFixed(3);
        td[6].textContent = c.mMag > 1e-4 ? `${deg(c.mAngle)}°` : '—';
        const tag = td[7].firstElementChild;
        tag.textContent = STATUS[c.status];
        tag.className = `tag ${c.status === 'stick' ? '' : 'slip'}`;
      });

      const totalChip = chipEls[chipEls.length - 1];
      totalChip.querySelector('b').textContent = `‖M‖ ${(d.Mmag / MS).toFixed(3)} Mₛ`;
      totalChip.querySelector('.val').textContent = `∠(H, M) ${d.Mmag > 1e-4 && d.Hmag > 1e-6 ? d.lagDeg.toFixed(0) : '—'}°`;

      rowEls[rowEls.length - 1].firstElementChild.textContent =
        `‖H‖ ${d.Hmag.toFixed(3)}  ·  H·ê ${d.hProj.toFixed(3)}  ·  ‖M‖ ${(d.Mmag / MS).toFixed(3)} Mₛ`
        + `  ·  M·ê ${(d.mProj / MS).toFixed(3)} Mₛ  ·  lag ${d.Mmag > 1e-4 && d.Hmag > 1e-6 ? d.lagDeg.toFixed(0) : '—'}°`
        + `  ·  path ${d.samples.length} samples`;
    },
  };
}

function buildLegends(legendField, legendLoop) {
  const field = [
    ['circle', 'var(--c1)', 'Cell 1'],
    ['circle', 'var(--c2)', 'Cell 2'],
    ['circle', 'var(--c3)', 'Cell 3'],
    ['solid', 'var(--ink)', 'H applied'],
    ['solid', 'var(--cm)', `M (drawn ×${M_SCALE})`],
  ];
  legendField.replaceChildren(...field.map(item), note('solid = Hᵣ,ₖ · dashed = Hᵢ,ₖ · faint = path so far'));
  legendLoop.replaceChildren(
    item(['solid', 'var(--cm)', 'M·ê traced']),
    item(['solid', 'var(--muted)', 'anhysteretic (κₖ = 0)']),
  );
}

function item([kind, color, text]) {
  const li = document.createElement('li');
  const key = node('i', `key ${kind === 'circle' ? 'circle' : ''}`);
  if (kind === 'circle') key.style.borderColor = color; else key.style.borderTopColor = color;
  li.append(key, txt(text));
  return li;
}
function note(text) {
  const li = document.createElement('li');
  li.style.color = 'var(--muted)';
  li.append(txt(text));
  return li;
}
function node(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
const txt = (s) => document.createTextNode(s);
const deg = (rad) => ((rad * 180) / Math.PI).toFixed(0);
