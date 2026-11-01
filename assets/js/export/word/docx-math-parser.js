/* ═══════════════════════════════════════════════
   docx-math-parser.js — Convert the supported LaTeX
   subset into editable Office Math (OMML) nodes using
   the constructors available in the bundled docx build.

   Unsupported commands fail explicitly; they are never
   silently removed or exported as italic source text.
   ═══════════════════════════════════════════════ */

class DocxMathConversionError extends Error {
  constructor(message, expression = "") {
    super(message);
    this.name = "DocxMathConversionError";
    this.code = "DOCX_MATH_CONVERSION";
    this.expression = String(expression);
  }
}

class DocxMathParser {
  static COMMANDS = {
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
    varepsilon: "ϵ", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ",
    iota: "ι", kappa: "κ", varkappa: "ϰ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
    omicron: "ο", pi: "π", varpi: "ϖ", rho: "ρ", varrho: "ϱ", varsigma: "ς",
    sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "ϕ", chi: "χ", psi: "ψ", omega: "ω",
    Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
    Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
    cdot: "⋅", cdotp: "·", centerdot: "·", dotplus: "∔", times: "×", div: "÷", pm: "±", mp: "∓",
    ast: "∗", star: "⋆", circ: "∘", bullet: "•", opbullet: "∙", diamond: "⋄", Diamond: "◇",
    oplus: "⊕", ominus: "⊖", otimes: "⊗", oslash: "⊘", odot: "⊙", uplus: "⊎", sqcup: "⊔", sqcap: "⊓",
    bigcirc: "◯", circledast: "⊛", circledcirc: "⊚", circleddash: "⊝", boxplus: "⊞", boxminus: "⊟",
    boxtimes: "⊠", boxdot: "⊡", ltimes: "⋉", rtimes: "⋊", divideontimes: "⋇", wr: "≀", amalg: "⨿",
    neq: "≠", ne: "≠", approx: "≈", equiv: "≡", le: "≤", leq: "≤", leqq: "≦", nleq: "≰",
    ge: "≥", geq: "≥", geqq: "≧", ngeq: "≱", lt: "<", gt: ">", nless: "≮", ngtr: "≯",
    lesssim: "≲", gtrsim: "≳", prec: "≺", nprec: "⊀", succ: "≻", nsucc: "⊁",
    to: "→", rightarrow: "→", leftarrow: "←", implies: "⇒", impliedby: "⇐", iff: "⇔",
    in: "∈", ni: "∋", owns: "∋", notin: "∉", mid: "∣", shortmid: "∣", nmid: "∤",
    parallel: "∥", shortparallel: "∥", nparallel: "∦", perp: "⊥", propto: "∝", doteq: "≐",
    sim: "∼", simeq: "≃", backsim: "∽", cong: "≅", asymp: "≍", triangleq: "≜",
    coloneqq: "≔", eqqcolon: "≕", risingdotseq: "≓", fallingdotseq: "≒", bowtie: "⋈",
    smile: "⌣", frown: "⌢", vdash: "⊢", dashv: "⊣", models: "⊧", Vdash: "⊩", vDash: "⊨", nvdash: "⊬",
    therefore: "∴", because: "∵", precedes: "≺", preceq: "≼", succeq: "≽", ll: "≪", gg: "≫",
    leqslant: "⩽", geqslant: "⩾", subset: "⊂", subseteq: "⊆", subsetneq: "⊊", sqsubset: "⊏", sqsubseteq: "⊑",
    supset: "⊃", supseteq: "⊇", supsetneq: "⊋", sqsupset: "⊐", sqsupseteq: "⊒", nsubseteq: "⊈", nsupseteq: "⊉",
    cup: "∪", union: "∪", cap: "∩", intersection: "∩", setminus: "∖", smallsetminus: "∖", complement: "∁",
    top: "⊤", bot: "⊥", forall: "∀", exists: "∃", nexists: "∄", neg: "¬", lnot: "¬", land: "∧", wedge: "∧",
    lor: "∨", vee: "∨", emptyset: "∅", varnothing: "∅", degree: "°", angle: "∠", measuredangle: "∡", sphericalangle: "∢",
    triangle: "△", bigtriangleup: "△", bigtriangledown: "▽", triangleleft: "◁", triangleright: "▷", lhd: "⊲", rhd: "⊳",
    square: "□", hbar: "ℏ", ell: "ℓ", wp: "℘", Re: "ℜ", Im: "ℑ", aleph: "ℵ", beth: "ℶ", gimel: "ℷ", daleth: "ℸ",
    mho: "℧", eth: "ð", imath: "ı", jmath: "ȷ", dagger: "†", ddagger: "‡", prime: "′", backprime: "‵",
    bigstar: "★", blacksquare: "■", lozenge: "◊", clubsuit: "♣", diamondsuit: "♢", heartsuit: "♡", spadesuit: "♠",
    infty: "∞", partial: "∂", nabla: "∇", ldots: "…", cdots: "⋯", dots: "…", vdots: "⋮", ddots: "⋱",
    lvert: "|", rvert: "|", vert: "|", midvert: "∣", Vert: "‖", lVert: "‖", rVert: "‖", lbrack: "[", rbrack: "]",
    langle: "⟨", rangle: "⟩", lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", lbrace: "{", rbrace: "}", colon: ":",
    backslash: "\\", lgroup: "⟮", rgroup: "⟯", llbracket: "⟦", rrbracket: "⟧", ulcorner: "⌜", urcorner: "⌝", llcorner: "⌞", lrcorner: "⌟",
    mapsto: "↦", longmapsto: "⟼", longrightarrow: "⟶", longleftarrow: "⟵", Longrightarrow: "⟹", Longleftarrow: "⟸",
    leftrightarrow: "↔", longleftrightarrow: "⟷", Longleftrightarrow: "⟺", Leftrightarrow: "⇔", Rightarrow: "⇒", Leftarrow: "⇐",
    uparrow: "↑", downarrow: "↓", Uparrow: "⇑", Downarrow: "⇓", updownarrow: "↕", Updownarrow: "⇕",
    nearrow: "↗", searrow: "↘", swarrow: "↙", nwarrow: "↖", twoheadrightarrow: "↠", twoheadleftarrow: "↞",
    rightharpoonup: "⇀", leftharpoonup: "↼", rightleftharpoons: "⇌", leftrightharpoons: "⇋", circlearrowleft: "↺", circlearrowright: "↻",
    hookrightarrow: "↪", hookleftarrow: "↩", gets: "←",
    sin: "sin", cos: "cos", tan: "tan", cot: "cot", sec: "sec", csc: "csc", sinh: "sinh", cosh: "cosh", tanh: "tanh", coth: "coth",
    arcsin: "arcsin", arccos: "arccos", arctan: "arctan", log: "log", ln: "ln", exp: "exp", min: "min", max: "max", sup: "sup", inf: "inf",
    lim: "lim", limsup: "lim sup", liminf: "lim inf", varlimsup: "lim sup", varliminf: "lim inf", injlim: "inj lim", projlim: "proj lim",
    deg: "deg", sgn: "sgn", lg: "lg", det: "det", gcd: "gcd", lcm: "lcm", ker: "ker", dim: "dim", hom: "hom", arg: "arg", Pr: "Pr", rank: "rank",
    tr: "tr", trace: "tr", mod: "mod", bmod: "mod", pmod: "mod",
  };

  static SPACING_COMMANDS = new Set([",", ":", ";", "!", " ", "quad", "qquad", "enspace", "thinspace"]);

  static stripDelimiters(expression) {
    const source = String(expression ?? "").trim();
    const delimiters = [
      ["$$", "$$"],
      ["\\(", "\\)"],
      ["\\[", "\\]"],
      ["$", "$"],
    ];

    for (const [open, close] of delimiters) {
      if (source.startsWith(open) && source.endsWith(close)) {
        return source.slice(open.length, source.length - close.length).trim();
      }
    }
    return source;
  }

  static fail(message, expression) {
    throw new DocxMathConversionError(message, expression);
  }

  static parseSequence(expression, docx) {
    const source = DocxMathParser.stripDelimiters(expression);
    if (!source) return [];

    const parser = new DocxLatexMathParser(source, docx);
    const nodes = parser.parseSequence();
    if (parser.index < source.length) {
      DocxMathParser.fail(
        `Unexpected LaTeX content near “${source.slice(parser.index)}”.`,
        source,
      );
    }
    return nodes;
  }

  static createMathNode(expression, docx) {
    const nodes = DocxMathParser.parseSequence(expression, docx);
    if (!nodes.length) return null;
    if (typeof docx?.Math !== "function") {
      DocxMathParser.fail("The loaded docx library does not support Word Math.", expression);
    }
    return new docx.Math({ children: nodes });
  }
}

class DocxLatexMathParser {
  constructor(source, docx) {
    this.source = String(source);
    this.docx = docx;
    this.index = 0;
  }

  get done() {
    return this.index >= this.source.length;
  }

  parseSequence(stopAt = null) {
    const nodes = [];
    while (!this.done) {
      const char = this.source[this.index];
      if (stopAt && char === stopAt) {
        this.index += 1;
        return nodes;
      }
      if (char === "}") {
        if (stopAt === "}") break;
        DocxMathParser.fail("Unmatched closing brace in LaTeX math.", this.source);
      }
      if (/\s/.test(char)) {
        this.index += 1;
        continue;
      }

      let atom;
      if (char === "^") {
        DocxMathParser.fail("A superscript has no base in LaTeX math.", this.source);
      } else if (char === "_") {
        DocxMathParser.fail("A subscript has no base in LaTeX math.", this.source);
      } else {
        atom = this.parseAtom();
      }
      if (atom) nodes.push(...this.asChildren(this.parseScripts(atom)));
    }

    if (stopAt) {
      DocxMathParser.fail(`Missing closing “${stopAt}” in LaTeX math.`, this.source);
    }
    return nodes;
  }

  parseAtom() {
    const char = this.source[this.index];
    if (char === "{") {
      this.index += 1;
      return this.parseSequence("}");
    }
    if (char === "(") {
      this.index += 1;
      return this.wrapDelimiter("round", this.parseSequence(")"));
    }
    if (char === "[") {
      this.index += 1;
      return this.wrapDelimiter("square", this.parseSequence("]"));
    }
    if (char === "\\") return this.parseCommand();
    if (char === "&") {
      DocxMathParser.fail("Matrix separator found outside a matrix environment.", this.source);
    }

    if (/[0-9]/.test(char)) {
      const number = this.source.slice(this.index).match(/^\d+(?:[.,]\d+)?/)[0];
      this.index += number.length;
      return this.run(number);
    }

    const codePoint = this.source.codePointAt(this.index);
    const symbol = String.fromCodePoint(codePoint);
    this.index += symbol.length;
    return this.run(symbol);
  }

  parseScripts(base) {
    let subScript = null;
    let superScript = null;
    while (!this.done && (this.source[this.index] === "_" || this.source[this.index] === "^")) {
      const marker = this.source[this.index++];
      const value = this.parseArgument();
      if (marker === "_") subScript = value;
      else superScript = value;
    }

    if (subScript && superScript) {
      return this.construct("MathSubSuperScript", {
        children: this.asChildren(base),
        subScript: this.asChildren(subScript),
        superScript: this.asChildren(superScript),
      });
    }
    if (subScript) {
      return this.construct("MathSubScript", {
        children: this.asChildren(base),
        subScript: this.asChildren(subScript),
      });
    }
    if (superScript) {
      return this.construct("MathSuperScript", {
        children: this.asChildren(base),
        superScript: this.asChildren(superScript),
      });
    }
    return base;
  }

  parseArgument() {
    while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;
    if (this.done) DocxMathParser.fail("Missing LaTeX script or command argument.", this.source);

    if (this.source[this.index] === "{") {
      this.index += 1;
      return this.parseSequence("}");
    }

    // An unbraced TeX argument is one token. The main atom parser groups
    // adjacent digits as a number, so split digits here (e.g. `\\tfrac12`
    // means numerator 1 and denominator 2).
    let atom;
    if (/[0-9]/.test(this.source[this.index])) {
      atom = this.run(this.source[this.index]);
      this.index += 1;
    } else {
      atom = this.parseAtom();
    }
    return this.parseScripts(atom);
  }

  parseCommand() {
    this.index += 1;
    if (this.done) DocxMathParser.fail("A trailing backslash is not valid LaTeX math.", this.source);

    const next = this.source[this.index];
    if (!/[A-Za-z]/.test(next)) {
      this.index += 1;
      if (DocxMathParser.SPACING_COMMANDS.has(next)) {
        return next === "!" ? [] : this.run(" ");
      }
      if (next === "|") return this.run("‖");
      if ("{}[]()%$&#_\\".includes(next)) return this.run(next);
      DocxMathParser.fail(`Unsupported LaTeX escape “\\${next}”.`, this.source);
    }

    const command = this.source.slice(this.index).match(/^[A-Za-z]+/)[0];
    this.index += command.length;

    if (command === "left" || command === "right" || command === "middle") {
      if (this.source[this.index] === ".") this.index += 1;
      return [];
    }
    if (
      [
        "limits",
        "nolimits",
        "displaystyle",
        "textstyle",
        "scriptstyle",
        "scriptscriptstyle",
        "big",
        "Big",
        "bigg",
        "Bigg",
        "bigl",
        "bigr",
        "Bigl",
        "Bigr",
        "biggl",
        "biggr",
        "Biggl",
        "Biggr",
      ].includes(command)
    ) {
      // Word chooses equation sizing itself; these TeX style directives do
      // not contribute visible content and can be safely ignored.
      return [];
    }
    if (DocxMathParser.SPACING_COMMANDS.has(command)) return this.run(" ");
    const extensibleArrows = {
      xrightarrow: "→",
      xleftarrow: "←",
      xleftrightarrow: "↔",
      xRightarrow: "⇒",
      xLeftarrow: "⇐",
      xLeftrightarrow: "⇔",
      xhookrightarrow: "↪",
      xhookleftarrow: "↩",
      xtwoheadrightarrow: "↠",
      xmapsto: "↦",
    };
    if (Object.prototype.hasOwnProperty.call(extensibleArrows, command)) {
      return this.parseExtensibleArrow(extensibleArrows[command]);
    }
    if (["binom", "tbinom", "dbinom"].includes(command)) {
      const upper = this.asChildren(this.parseArgument());
      const lower = this.asChildren(this.parseArgument());
      const matrix = new this.docx.XmlComponent("m:m");
      matrix.addChildElement(new this.docx.XmlComponent("m:mPr"));
      for (const value of [upper, lower]) {
        const row = new this.docx.XmlComponent("m:mr");
        const cell = new this.docx.XmlComponent("m:e");
        for (const child of value) cell.addChildElement(child);
        row.addChildElement(cell);
        matrix.addChildElement(row);
      }
      return this.construct("MathRoundBrackets", { children: [matrix] });
    }
    if (command === "frac" || command === "dfrac" || command === "tfrac") {
      const numerator = this.parseArgument();
      const denominator = this.parseArgument();
      return this.construct("MathFraction", {
        numerator: this.asChildren(numerator),
        denominator: this.asChildren(denominator),
      });
    }
    if (command === "sqrt") {
      let degree = null;
      while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;
      if (this.source[this.index] === "[") {
        this.index += 1;
        degree = this.parseSequence("]");
      }
      const contents = this.parseArgument();
      return this.construct("MathRadical", {
        ...(degree ? { degree: this.asChildren(degree) } : {}),
        children: this.asChildren(contents),
      });
    }
    if (["sum", "prod", "coprod", "bigcup", "bigcap", "bigvee", "bigwedge", "bigoplus", "bigotimes", "bigodot", "biguplus", "bigsqcup", "int", "iint", "iiint", "oint", "oiint", "oiiint"].includes(command)) {
      return this.parseNary(command);
    }
    if (command === "not") {
      const nextChar = this.source[this.index];
      if (nextChar === "=") {
        this.index += 1;
        return this.run("≠");
      }
      if (nextChar === "<" || nextChar === ">") {
        this.index += 1;
        return this.run(nextChar === "<" ? "≮" : "≯");
      }
      if (nextChar === String.fromCharCode(92)) {
        this.index += 1;
        const negatedCommand = this.source.slice(this.index).match(/^[A-Za-z]+/)?.[0];
        if (negatedCommand) {
          this.index += negatedCommand.length;
          const negatedSymbols = {
            in: "∉", ni: "∌", mid: "∤", parallel: "∦", equiv: "≢",
            sim: "≁", approx: "≉", subset: "⊄", subseteq: "⊈",
            supset: "⊅", supseteq: "⊉", lesssim: "≴", gtrsim: "≵",
          };
          if (negatedSymbols[negatedCommand]) return this.run(negatedSymbols[negatedCommand]);
          DocxMathParser.fail(`Unsupported negated LaTeX command “\\not\\${negatedCommand}”.`, this.source);
        }
      }
      DocxMathParser.fail("\\not must precede a supported relation or an equals sign.", this.source);
    }
    if (command === "begin") return this.parseEnvironment();
    if (command === "overbrace" || command === "underbrace") {
      return this.parseGroupCharacter(command === "overbrace" ? "top" : "bottom");
    }
    if (["overline", "bar", "vec", "hat", "widehat", "tilde", "dot", "ddot", "dddot", "acute", "grave", "breve", "check", "mathring", "overrightarrow", "overleftarrow", "widetilde"].includes(command)) {
      return this.parseAccent(command);
    }
    if (["overset", "stackrel", "underset"].includes(command)) {
      return this.parseLimitCommand(command);
    }
    if (command === "underline") return this.parseBar("bottom");
    if (command === "boxed") return this.parseBox("m:borderBox");
    if (command === "phantom") return this.parseBox("m:phant");
    if (command === "pmod") {
      const value = this.asChildren(this.parseArgument());
      return this.construct("MathRoundBrackets", { children: [this.run("mod "), ...value] });
    }
    if (command === "bmod" || command === "mod") return this.run(" mod ");
    if (command === "text" || command === "operatorname") {
      return this.run(this.readRequiredGroupText(`argument for \\${command}`));
    }
    if (["textbf", "textit", "textnormal", "textrm", "textsf", "texttt"].includes(command)) {
      return this.run(this.readRequiredGroupText(`argument for \\${command}`));
    }
    if (
      ["mathrm", "mathbf", "mathit", "mathcal", "mathsf", "mathtt", "mathfrak", "boldsymbol", "bm"].includes(command)
    ) {
      return this.parseArgument();
    }
    if (command === "mathbb") {
      const value = this.readRequiredGroupText("argument for \\mathbb");
      const blackboard = { N: "ℕ", Z: "ℤ", Q: "ℚ", R: "ℝ", C: "ℂ", P: "ℙ", H: "ℍ" };
      return this.run(blackboard[value] || value);
    }

    if (Object.prototype.hasOwnProperty.call(DocxMathParser.COMMANDS, command)) {
      return this.run(DocxMathParser.COMMANDS[command]);
    }
    DocxMathParser.fail(`Unsupported LaTeX command “\\${command}”.`, this.source);
  }

  parseExtensibleArrow(arrowGlyph) {
    while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;

    let lowerLabel = [];
    if (this.source[this.index] === "[") {
      this.index += 1;
      lowerLabel = this.parseSequence("]");
    }

    while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;
    if (this.done || "=+-<>)]}".includes(this.source[this.index])) {
      DocxMathParser.fail("An extensible arrow is missing its upper label.", this.source);
    }

    const upperLabel = this.asChildren(this.parseArgument());
    if (!upperLabel.length) {
      DocxMathParser.fail("An extensible arrow has an empty upper label.", this.source);
    }

    const arrowBase = [this.run(arrowGlyph)];
    let base = arrowBase;

    if (lowerLabel.length) {
      const lowerLimit = new this.docx.XmlComponent("m:limLow");
      lowerLimit.addChildElement(new this.docx.XmlComponent("m:limLowPr"));
      const lowerBase = new this.docx.XmlComponent("m:e");
      for (const child of arrowBase) lowerBase.addChildElement(child);
      const lower = new this.docx.XmlComponent("m:lim");
      for (const child of lowerLabel) lower.addChildElement(child);
      lowerLimit.addChildElement(lowerBase);
      lowerLimit.addChildElement(lower);
      base = [lowerLimit];
    }

    const upperLimit = new this.docx.XmlComponent("m:limUpp");
    upperLimit.addChildElement(new this.docx.XmlComponent("m:limUppPr"));
    const upperBase = new this.docx.XmlComponent("m:e");
    for (const child of base) upperBase.addChildElement(child);
    const upper = new this.docx.XmlComponent("m:lim");
    for (const child of upperLabel) upper.addChildElement(child);
    upperLimit.addChildElement(upperBase);
    upperLimit.addChildElement(upper);
    return upperLimit;
  }

  parseNary(command) {
    let subScript = null;
    let superScript = null;
    const skipModifiers = () => {
      let skipped = true;
      while (!this.done && skipped) {
        skipped = false;
        while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;
        const modifier = this.source
          .slice(this.index)
          .match(/^\\(?:limits|nolimits|displaystyle|textstyle|scriptstyle|scriptscriptstyle)/);
        if (modifier) {
          this.index += modifier[0].length;
          skipped = true;
        }
      }
    };

    while (!this.done) {
      skipModifiers();
      const marker = this.source[this.index];
      if (marker !== "_" && marker !== "^") break;
      this.index += 1;
      const argument = this.parseArgument();
      if (marker === "_") subScript = this.asChildren(argument);
      else superScript = this.asChildren(argument);
    }
    skipModifiers();

    while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;
    const body = [];

    // Consume the operator's complete operand until an outer relation or
    // additive term. Groups and scripts are parsed structurally along the way.
    while (!this.done && !"=+-<>".includes(this.source[this.index])) {
      if (/\s/.test(this.source[this.index])) {
        this.index += 1;
        continue;
      }
      if (this.source.startsWith("\\,", this.index)) {
        this.index += 2;
        continue;
      }
      if (this.source[this.index] === ")" || this.source[this.index] === "}") break;
      const operand = this.parseAtom();
      if (operand) body.push(...this.asChildren(this.parseScripts(operand)));
    }
    // A sum/product/integral may be written as an operator with bounds alone.
    // Keep an empty OMML base so Word can render the operator and its limits.
    if (!body.length) body.push(this.run(""));

    const options = {
      children: body,
      ...(subScript ? { subScript } : {}),
      ...(superScript ? { superScript } : {}),
    };
    if (command === "sum") return this.construct("MathSum", options);
    if (command === "int") return this.construct("MathIntegral", options);

    const operatorGlyph = {
      prod: "∏", coprod: "∐", bigcup: "⋃", bigcap: "⋂", bigvee: "⋁", bigwedge: "⋀",
      bigoplus: "⨁", bigotimes: "⨂", bigodot: "⨀", biguplus: "⨄", bigsqcup: "⨆",
      iint: "∬", iiint: "∭", oint: "∮", oiint: "∯", oiiint: "∰",
    }[command];
    if (!operatorGlyph) {
      DocxMathParser.fail(`Unsupported n-ary operator “\\${command}”.`, this.source);
    }

    const nary = new this.docx.XmlComponent("m:nary");
    nary.addChildElement(new this.docx.MathNAryProperties(
      operatorGlyph,
      !!superScript,
      !!subScript,
    ));
    if (subScript) nary.addChildElement(new this.docx.MathSubScriptElement(subScript));
    if (superScript) nary.addChildElement(new this.docx.MathSuperScriptElement(superScript));
    nary.addChildElement(new this.docx.MathBase(body));
    return nary;
  }

  mathAttributeElement(name, value) {
    const element = new this.docx.XmlComponent(name);
    element.addChildElement(
      new this.docx.XmlAttributeComponent({ "m:val": value }),
    );
    return element;
  }

  parseGroupCharacter(position) {
    const contents = this.asChildren(this.parseArgument());
    const character = position === "top" ? "⏞" : "⏟";
    const properties = new this.docx.XmlComponent("m:groupChrPr");
    const ommlPosition = position === "top" ? "top" : "bot";
    properties.addChildElement(this.mathAttributeElement("m:chr", character));
    properties.addChildElement(this.mathAttributeElement("m:pos", ommlPosition));
    properties.addChildElement(this.mathAttributeElement("m:vertJc", ommlPosition));

    const groupCharacter = new this.docx.XmlComponent("m:groupChr");
    groupCharacter.addChildElement(properties);
    groupCharacter.addChildElement(new this.docx.MathBase(contents));
    return groupCharacter;
  }

  parseBar(position) {
    const contents = this.asChildren(this.parseArgument());
    const properties = new this.docx.XmlComponent("m:barPr");
    properties.addChildElement(this.mathAttributeElement("m:pos", position === "top" ? "top" : "bot"));
    const bar = new this.docx.XmlComponent("m:bar");
    bar.addChildElement(properties);
    bar.addChildElement(new this.docx.MathBase(contents));
    return bar;
  }

  parseBox(elementName) {
    const contents = this.asChildren(this.parseArgument());
    const box = new this.docx.XmlComponent(elementName);
    const propertiesName = elementName === "m:phant" ? "m:phantPr" : "m:borderBoxPr";
    box.addChildElement(new this.docx.XmlComponent(propertiesName));
    box.addChildElement(new this.docx.MathBase(contents));
    return box;
  }

  parseAccent(command) {
    const contents = this.asChildren(this.parseArgument());
    const accents = {
      overline: "¯", bar: "¯", vec: "⃗", hat: "ˆ", widehat: "ˆ", tilde: "˜",
      dot: "̇", ddot: "̈", dddot: "⃛", acute: "́", grave: "̀", breve: "̆",
      check: "̌", mathring: "̊", overrightarrow: "⃗", overleftarrow: "⃖", widetilde: "˜",
    };
    const accent = new this.docx.XmlComponent("m:acc");
    const properties = new this.docx.XmlComponent("m:accPr");
    properties.addChildElement(new this.docx.MathAccentCharacter(accents[command]));
    accent.addChildElement(properties);
    accent.addChildElement(new this.docx.MathBase(contents));
    return accent;
  }

  parseLimitCommand(command) {
    const annotation = this.asChildren(this.parseArgument());
    const base = this.asChildren(this.parseArgument());
    const isLower = command === "underset";
    const limitElement = new this.docx.XmlComponent(isLower ? "m:limLow" : "m:limUpp");
    limitElement.addChildElement(new this.docx.XmlComponent(isLower ? "m:limLowPr" : "m:limUppPr"));
    const expression = new this.docx.XmlComponent("m:e");
    for (const child of base) expression.addChildElement(child);
    const limit = new this.docx.XmlComponent("m:lim");
    for (const child of annotation) limit.addChildElement(child);
    limitElement.addChildElement(expression);
    limitElement.addChildElement(limit);
    return limitElement;
  }

  parseEnvironment() {
    const environment = this.readRequiredGroupText("matrix environment name");
    const supported = new Set(["matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "cases"]);
    if (!supported.has(environment)) {
      DocxMathParser.fail(`Unsupported LaTeX environment “${environment}”.`, this.source);
    }

    const endMarker = `\\end{${environment}}`;
    const end = this.source.indexOf(endMarker, this.index);
    if (end === -1) DocxMathParser.fail(`Missing ${endMarker} in LaTeX math.`, this.source);
    const body = this.source.slice(this.index, end);
    this.index = end + endMarker.length;

    const matrix = new this.docx.XmlComponent("m:m");
    matrix.addChildElement(new this.docx.XmlComponent("m:mPr"));
    for (const rowSource of this.splitAtTopLevel(body, "\\\\")) {
      if (!rowSource.trim()) continue;
      const row = new this.docx.XmlComponent("m:mr");
      for (const cellSource of this.splitAtTopLevel(rowSource, "&")) {
        const cell = new this.docx.XmlComponent("m:e");
        for (const child of DocxMathParser.parseSequence(cellSource, this.docx)) {
          cell.addChildElement(child);
        }
        row.addChildElement(cell);
      }
      matrix.addChildElement(row);
    }

    if (environment === "pmatrix") {
      return this.construct("MathRoundBrackets", { children: [matrix] });
    }
    if (environment === "bmatrix") {
      return this.construct("MathSquareBrackets", { children: [matrix] });
    }
    if (environment === "Bmatrix" || environment === "cases") {
      return this.construct("MathCurlyBrackets", { children: [matrix] });
    }
    if (environment === "vmatrix" || environment === "Vmatrix") {
      const bars = environment === "vmatrix" ? "|" : "‖";
      const delimiter = new this.docx.XmlComponent("m:d");
      const properties = new this.docx.XmlComponent("m:dPr");
      properties.addChildElement(new this.docx.MathBeginningCharacter(bars));
      properties.addChildElement(new this.docx.MathEndingCharacter(bars));
      delimiter.addChildElement(properties);
      delimiter.addChildElement(new this.docx.MathBase([matrix]));
      return delimiter;
    }
    return matrix;
  }

  readRequiredGroupText(label) {
    while (!this.done && /\s/.test(this.source[this.index])) this.index += 1;
    if (this.source[this.index] !== "{") DocxMathParser.fail(`Missing ${label}.`, this.source);
    this.index += 1;
    const start = this.index;
    while (!this.done && this.source[this.index] !== "}") this.index += 1;
    if (this.done) DocxMathParser.fail(`Unclosed ${label}.`, this.source);
    const value = this.source.slice(start, this.index).trim();
    this.index += 1;
    return value;
  }

  splitAtTopLevel(source, delimiter) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (
        source.startsWith(delimiter, i) &&
        depth === 0 &&
        (delimiter === "&" || char === "\\")
      ) {
        parts.push(source.slice(start, i));
        i += delimiter.length - 1;
        start = i + 1;
      } else if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
    }
    parts.push(source.slice(start));
    return parts;
  }

  wrapDelimiter(kind, children) {
    const constructors = {
      round: "MathRoundBrackets",
      square: "MathSquareBrackets",
      curly: "MathCurlyBrackets",
    };
    return this.construct(constructors[kind], { children: this.asChildren(children) });
  }

  asChildren(value) {
    if (Array.isArray(value)) return value;
    return value == null ? [] : [value];
  }

  flattenRuns(nodes) {
    return this.asChildren(nodes).map((node) => {
      if (node instanceof this.docx.MathRun) return node.text ?? "";
      return "";
    }).join("");
  }

  run(text) {
    return new this.docx.MathRun(String(text));
  }

  construct(name, options) {
    const Constructor = this.docx[name];
    if (typeof Constructor !== "function") {
      DocxMathParser.fail(`The bundled docx library does not provide ${name}.`, this.source);
    }
    return new Constructor(options);
  }
}
