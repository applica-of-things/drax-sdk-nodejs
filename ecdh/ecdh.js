const polynomial = [ 0x000000c9, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000008 ];
const coeff_b    = [ 0x4a3205fd, 0x512f7874, 0x1481eb10, 0xb8c953ca, 0x0a601907, 0x00000002 ];
const base_x     = [ 0xe8343e36, 0xd4994637, 0xa0991168, 0x86a2d57e, 0xf0eba162, 0x00000003 ];
const base_y     = [ 0x797324f1, 0xb11c5c0c, 0xa2cdd545, 0x71a0094f, 0xd51fbc6c, 0x00000000 ];
const base_order = [ 0xa4234c33, 0x77e70c12, 0x000292fe, 0x00000000, 0x00000000, 0x00000004 ];

const CURVE_DEGREE = 163
const ECC_PRV_KEY_SIZE = 24
const ECC_PUB_KEY_SIZE = (2 * ECC_PRV_KEY_SIZE)
const BITVEC_MARGIN = 3
const BITVEC_NBITS = (CURVE_DEGREE + BITVEC_MARGIN)
const BITVEC_NWORDS = parseInt(((BITVEC_NBITS + 31) / 32))
const BITVEC_NBYTES = (4 * BITVEC_NWORDS)

function to_8bit(src32) {
  let bytes = [0, 0, 0, 0];
  bytes[0] = src32 & 0xFF;     
  bytes[1] = (src32 >> 8) & 0xFF;
  bytes[2] = (src32 >> 16) & 0xFF;
  bytes[3] = (src32 >> 24) & 0xFF;
  return bytes;
}

function to_32bit(arr8) {
  let result = 0;
  result += (arr8[0] << 0);
  result += (arr8[1] << 8);
  result += (arr8[2] << 16);
  result += (arr8[3] << 24);
  return result;
}

function to_8bit_arr(arr32) {
  let arr8 = new Uint8Array(arr32.length * 4);
  for (let i = 0; i < arr32.length; i++)  {
    let n8 = to_8bit(arr32[i]);
    for (let y = 3; y >= 0; y--) {
      arr8[(i * 4) + y] = n8[y];
    }
  }
  return arr8;
}

function to_32bit_arr(arr8) {
  let arr32 = new Uint32Array(arr8.length / 4);
  for (let i = 0; i < arr32.length; i++)  {
    let src8 = arr8.slice((i * 4), (i * 4) + 4);
    assert(src8.length == 4);
    let n32 = to_32bit(src8);
    arr32[i] = n32;
  }
  return arr32;
}

function randomize(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(Math.random() * 255);
  }

  return arr;
}

function sequence(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = i + 1;
  }

  return arr;
}

function Ptr(arr) {
  this.arr = arr;
  this.pos = 0;
}

function cast_to_uint8array(uint32array) {
  return new Uint8Array(uint32array);
}

function cast_to_uint32array(uint8array) {
  return new Uint32Array(uint8array);
}

function copy_arr(src, dst) {
  for (let i = 0; i < src.length; i++) {
    dst[i] = src[i];
  }
}

Ptr.prototype = {
  set: function(pos, value) { this.arr[pos] = value },
  get: function(pos) { return this.arr[pos || this.pos] },
  inc: function(v) {
    if (this.pos >= this.arr.length - 1) {
      throw new Error("Out of range");
    }
    this.pos++;
    if (v) {
      this.set(this.pos, v);
    } else {
      return this.get(this.pos);
    }
  },
  dec: function(v) {
    if (this.pos <= 0) {
      throw new Error("Out of range");
    }
    this.pos--;
    if (v) {
      this.set(this.pos, v);
    } else {
      return this.get(this.pos);
    }
  },
  move: function(pos) {
    let newpos = pos;
    if (newpos > this.arr.length - 1) {
      throw new Error("Out of range");
    }
    if (newpos < 0) {
      throw new Error("Out of range");
    }
    this.pos = newpos;
  },
  end: function() {
    this.pos = this.arr.length - 1;
  }
}

function ptr(arr) { return new Ptr(arr) }

function newbitvec() {
  return new Uint32Array(BITVEC_NWORDS);
}

function bitvec_get_bit(x, idx)
{
  return ((x[parseInt(idx / 32)] >> (idx & 31) & 1));
}

function bitvec_clr_bit(x, idx)
{
  let index = parseInt(idx / 32)
  let src = (x[index]);
  let logical_and = (idx & 31);
  let left_shift = (1 << logical_and);
  let right = (~(left_shift));
  let dst = (src & right);
  x[index] = dst;
}

function bitvec_copy(x, y)
{
  let i;
  for (i = 0; i < BITVEC_NWORDS; ++i)
  {
    x[i] = y[i];
  }
}

function bitvec_swap(x, y)
{
  let tmp = newbitvec();
  bitvec_copy(tmp, x);
  bitvec_copy(x, y);
  bitvec_copy(y, tmp);
}

/* fast version of equality test */
function bitvec_equal(x, y)
{
  let i;
  for (i = 0; i < BITVEC_NWORDS; ++i)
  {
    if (x[i] != y[i])
    {
      return 0;
    }
  }
  return 1;
}


function bitvec_set_zero(x)
{
  let i;
  for (i = 0; i < BITVEC_NWORDS; ++i)
  {
    x[i] = 0;
  }
}

/* fast implementation */
function bitvec_is_zero(x)
{
  i = 0;
  while (i < BITVEC_NWORDS)
  {
    if (x[i] != 0)
    {
      break;
    }
    i += 1;
  }
  return (i == BITVEC_NWORDS);
}


/* return the number of the highest one-bit + 1 */
function bitvec_degree(x)
{
  let i = BITVEC_NWORDS * 32;

  /* Start at the back of the vector (MSB) */
  px = ptr(x);
  px.move(BITVEC_NWORDS - 1);
  
  /* Skip empty / zero words */
  while ((i > 0) && (px.get() == 0))
  {
    px.dec();
    i -= 32;
  }
  /* Run through rest if count is not multiple of bitsize of DTYPE */
  if (i != 0)
  {
    let u32mask = (1 << 31);
    while ((px.get() & u32mask) == 0)
    {
      u32mask >>= 1;
      i -= 1;
    }
  }
  return i;
}

/* left-shift by 'count' digits */
function bitvec_lshift(x, y, nbits)
{
  let nwords = parseInt((nbits / 32));

  /* Shift whole words first if nwords > 0 */
  let i,j;
  for (i = 0; i < nwords; ++i)
  {
    /* Zero-initialize from least-significant word until offset reached */
    x[i] = 0;
  }
  j = 0;
  /* Copy to x output */
  while (i < BITVEC_NWORDS)
  {
    x[i] = y[j];
    i += 1;
    j += 1;
  }

  /* Shift the rest if count was not multiple of bitsize of DTYPE */
  nbits &= 31;
  if (nbits != 0)
  {
    /* Left shift rest */
    let i;
    for (i = (BITVEC_NWORDS - 1); i > 0; --i)
    {
      let src = to_uint32(x[i]);
      let left = to_uint32(src << nbits);
      let src2 = to_uint32(x[i - 1]);
      let right = to_uint32(src2 / Math.pow(2, 32 - nbits));
      let or = to_uint32(left | right);
      x[i] = or;
      //x[i]  = (to_uint32(x[i] << nbits)) | (to_uint32(x[i - 1] >> (32 - nbits)));
    }
    x[0] <<= nbits;
  }
}

var _cast_uint32arr = new Uint32Array(1);
function to_uint32(n) {
  _cast_uint32arr[0] = n;
  return _cast_uint32arr[0];
}


/*************************************************************************************************/
/*
  Code that does arithmetic on bit-vectors in the Galois Field GF(2^CURVE_DEGREE).
*/
/*************************************************************************************************/


function gf2field_set_one(x)
{
  /* Set first word to one */
  x[0] = 1;
  /* .. and the rest to zero */
  let i;
  for (i = 1; i < BITVEC_NWORDS; ++i)
  {
    x[i] = 0;
  }
}

/* fastest check if x == 1 */
function gf2field_is_one(x) 
{
  /* Check if first word == 1 */
  if (x[0] != 1)
  {
    return 0;
  }
  /* ...and if rest of words == 0 */
  let i;
  for (i = 1; i < BITVEC_NWORDS; ++i)
  {
    if (x[i] != 0)
    {
      break;
    }
  }
  return (i == BITVEC_NWORDS);
}

/* galois field(2^m) addition is modulo 2, so XOR is used instead - 'z := a + b' */
function gf2field_add(z, x, y)
{
  let i;
  for (i = 0; i < BITVEC_NWORDS; ++i)
  {
    z[i] = (x[i] ^ y[i]);
  }
}

/* increment element */
function gf2field_inc(x)
{
  x[0] ^= 1;
}

function assert(condition) {
  if (!condition) {
    throw new Error("assert failed");
  }
}

/* field multiplication 'z := (x * y)' */
function gf2field_mul(z, x, y)
{
  let i;
  let tmp = newbitvec();

  assert(z != y);

  bitvec_copy(tmp, x);

  /* LSB set? Then start with x */
  if (bitvec_get_bit(y, 0) != 0)
  {
    bitvec_copy(z, x);
  }
  else /* .. or else start with zero */
  {
    bitvec_set_zero(z);
  }

  /* Then add 2^i * x for the rest */
  for (i = 1; i < CURVE_DEGREE; ++i)
  {
    /* lshift 1 - doubling the value of tmp */
    bitvec_lshift(tmp, tmp, 1);

    /* Modulo reduction polynomial if degree(tmp) > CURVE_DEGREE */
    if (bitvec_get_bit(tmp, CURVE_DEGREE))
    {
      gf2field_add(tmp, tmp, polynomial);
    }

    /* Add 2^i * tmp if this factor in y is non-zero */
    if (bitvec_get_bit(y, i))
    {
      gf2field_add(z, z, tmp);
    }
  }
}

/* field inversion 'z := 1/x' */
function gf2field_inv(z, x)
{
  let u = newbitvec();
  let v = newbitvec();
  let g = newbitvec();
  let h = newbitvec();
  let i;

  bitvec_copy(u, x);
  bitvec_copy(v, polynomial);
  bitvec_set_zero(g);
  gf2field_set_one(z);
  
  while (!gf2field_is_one(u))
  {
    i = (bitvec_degree(u) - bitvec_degree(v));

    if (i < 0)
    {
      bitvec_swap(u, v);
      bitvec_swap(g, z);
      i = -i;
    }

    bitvec_lshift(h, v, i);
    gf2field_add(u, u, h);
    bitvec_lshift(h, g, i);
    gf2field_add(z, z, h);
  }
}

/*************************************************************************************************/
/*
   The following code takes care of Galois-Field arithmetic. 
   Elliptic curve points are represented  by pairs (x,y) of bitvec_t. 
   It is assumed that curve coefficient 'a' is {0,1}
   This is the case for all NIST binary curves.
   Coefficient 'b' is given in 'coeff_b'.
   '(base_x, base_y)' is a point that generates a large prime order group.
*/
/*************************************************************************************************/


function gf2point_copy(x1, y1, x2, y2)
{
  bitvec_copy(x1, x2);
  bitvec_copy(y1, y2);
}

function gf2point_set_zero(x, y)
{
  bitvec_set_zero(x);
  bitvec_set_zero(y);
}

function gf2point_is_zero(x, y)
{
  return (    bitvec_is_zero(x)
           && bitvec_is_zero(y));
}

/* double the point (x,y) */
function gf2point_double(x, y)
{
  /* iff P = O (zero or infinity): 2 * P = P */
  if (bitvec_is_zero(x))
  {
    bitvec_set_zero(y);
  }
  else
  {
    let l = newbitvec();

    gf2field_inv(l, x);
    gf2field_mul(l, l, y);
    gf2field_add(l, l, x);
    gf2field_mul(y, x, x);
    gf2field_mul(x, l, l);
    gf2field_inc(l);
    gf2field_add(x, x, l);
    gf2field_mul(l, l, x);
    gf2field_add(y, y, l);
  }
}


/* add two points together (x1, y1) := (x1, y1) + (x2, y2) */
function gf2point_add(x1, y1, x2, y2)
{
  if (!gf2point_is_zero(x2, y2))
  {
    if (gf2point_is_zero(x1, y1))
    {
      gf2point_copy(x1, y1, x2, y2);
    }
    else
    {
      if (bitvec_equal(x1, x2))
      {
        if (bitvec_equal(y1, y2))
        {
          gf2point_double(x1, y1);
        }
        else
        {
          gf2point_set_zero(x1, y1);
        }
      }
      else
      {
        /* Arithmetic with temporary variables */
        let a = newbitvec();
        let b = newbitvec();
        let c = newbitvec();
        let d = newbitvec();

        gf2field_add(a, y1, y2);
        gf2field_add(b, x1, x2);
        gf2field_inv(c, b);
        gf2field_mul(c, c, a);
        gf2field_mul(d, c, c);
        gf2field_add(d, d, c);
        gf2field_add(d, d, b);
        gf2field_inc(d);
        gf2field_add(x1, x1, d);
        gf2field_mul(a, x1, c);
        gf2field_add(a, a, d);
        gf2field_add(y1, y1, a);
        bitvec_copy(x1, d);
      }
    }
  }
}


/* point multiplication via double-and-add algorithm */
function gf2point_mul(x, y, exp)
{
  let tmpx = newbitvec();
  let tmpy = newbitvec();
  let i;
  let nbits = bitvec_degree(exp);

  gf2point_set_zero(tmpx, tmpy);

  for (i = (nbits - 1); i >= 0; --i)
  {
    gf2point_double(tmpx, tmpy);
    if (bitvec_get_bit(exp, i))
    {
      gf2point_add(tmpx, tmpy, x, y);
    }
  }
  gf2point_copy(x, y, tmpx, tmpy);
}




/* check if y^2 + x*y = x^3 + a*x^2 + coeff_b holds */
function gf2point_on_curve(x, y)
{
  let a = newbitvec();
  let b = newbitvec();

  if (gf2point_is_zero(x, y))
  {
    return 1;
  }
  else
  {
    gf2field_mul(a, x, x);
    gf2field_mul(b, a, x);
    gf2field_add(a, a, b);
    gf2field_add(a, a, coeff_b);
    gf2field_mul(b, y, y);
    gf2field_add(a, a, b);
    gf2field_mul(b, x, y);

    return bitvec_equal(a, b);
  }
}


/*************************************************************************************************/
/*
  Elliptic Curve Diffie-Hellman key exchange protocol.
*/
/*************************************************************************************************/

function print_arr(arr) {
  let buf = "";
  for (let i = 0; i < arr.length; i++) {
    let c = arr[i];
    buf += c + ":";
  }
  console.log(buf);
}

/* NOTE: private should contain random data a-priori! */
function ecdh_generate_keys(public_key_8, private_key_8)
{
  let public_key = to_32bit_arr(public_key_8);
  let private_key = to_32bit_arr(private_key_8);

/* Get copy of "base" point 'G' */
  let out = new Halfbitvec(public_key);
  gf2point_copy(out.first, out.second, base_x, base_y);
  out.merge();

  /* Abort key generation if random number is too small */
  if (bitvec_degree(private_key) < (parseInt(CURVE_DEGREE / 2)))
  {
    return 0;
  }
  else
  {
    /* Clear bits > CURVE_DEGREE in highest word to satisfy constraint 1 <= exp < n. */
    let nbits = bitvec_degree(base_order);
    let i;

    for (i = (nbits - 1); i < (BITVEC_NWORDS * 32); ++i)
    {
      bitvec_clr_bit(private_key, i);
    }


    /* Multiply base-point with scalar (private-key) */
    out = new Halfbitvec(public_key);
    gf2point_mul(out.first, out.second, private_key);
    out.merge();

    copy_arr(to_8bit_arr(public_key), public_key_8);
    copy_arr(to_8bit_arr(private_key), private_key_8);

    return 1;
  }
}



function ecdh_shared_secret(private_key_8, others_pub_8, output_8)
{
  let others_pub = to_32bit_arr(others_pub_8);
  let private_key = to_32bit_arr(private_key_8);
  let output = to_32bit_arr(output_8);


  let out = new Halfbitvec(others_pub);
  /* Do some basic validation of other party's public key */
  if (    !gf2point_is_zero (out.first, out.second)
       &&  gf2point_on_curve(out.first, out.second) )
  {
    /* Copy other side's public key to output */
    let i;
    for (i = 0; i < (BITVEC_NBYTES * 2); ++i)
    {
      output[i] = others_pub[i];
    }

    /* Multiply other side's public key with own private key */
    out = new Halfbitvec(output);
    gf2point_mul(out.first, out.second, private_key);
    out.merge();

    copy_arr(to_8bit_arr(output), output_8);

    return 1;
  }
  else
  {
    return 0;
  }
}

function Halfbitvec(bigarr) {
  this.bigarr = bigarr;
  let half = bigarr.length / 2;
  this.first = bigarr.slice(0, half);
  this.second = bigarr.slice(half, half * 2);
  assert(this.first.length == half);
  assert(this.second.length == half);
  
}

Halfbitvec.prototype = {
  merge: function() {
    for (let i = 0; i < this.first.length; i++) {
      this.bigarr[i] = this.first[i];
      this.bigarr[i + this.first.length] = this.second[i];
    }
  }
}


module.exports = {
  ecdh_shared_secret: ecdh_shared_secret,
  ECC_PUB_KEY_SIZE: ECC_PUB_KEY_SIZE
}