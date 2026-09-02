'use strict';

/**
 * Normalises stored image values into the shape the Aurasure mobile app
 * expects (`ImageRef`):
 *   null                     -> null
 *   { kind:'uri', uri }      -> { kind:'uri', uri }
 *   { kind:'asset' }         -> null (local bundled asset, not served)
 * Any other object is passed through untouched.
 */
function toAppImage(image) {
  if (image == null) return null;
  if (typeof image !== 'object') return null;
  if (image.kind === 'uri' && typeof image.uri === 'string') {
    return { kind: 'uri', uri: image.uri };
  }
  if (image.kind === 'asset') return null;
  return image;
}

module.exports = { toAppImage };
