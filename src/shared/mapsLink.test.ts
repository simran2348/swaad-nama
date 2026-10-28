import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coordsFromMapsUrl,
  isFullMapsLink,
  isShortMapsLink,
  placeNameFromMapsUrl,
} from './mapsLink.ts';

const PLACE =
  'https://www.google.com/maps/place/Vaishali+Restaurant/@18.5203,73.8401,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d18.5208!4d73.8412!16s';

test('recognises Google Maps links', () => {
  assert.equal(isShortMapsLink('https://maps.app.goo.gl/AbC123'), true);
  assert.equal(isShortMapsLink('https://goo.gl/maps/AbC123'), true);
  assert.equal(isShortMapsLink('https://goo.gl/other'), false);
  assert.equal(isShortMapsLink('http://maps.app.goo.gl/AbC123'), false);
  assert.equal(isFullMapsLink(PLACE), true);
  assert.equal(isFullMapsLink('https://maps.google.co.in/?q=1,2'), true);
  assert.equal(isFullMapsLink('https://evil.com/maps/place/x'), false);
  assert.equal(isFullMapsLink('https://www.google.com/search?q=x'), false);
  assert.equal(isFullMapsLink('not a url'), false);
});

test('prefers the place pin over the map view', () => {
  assert.deepEqual(coordsFromMapsUrl(PLACE), { lat: 18.5208, lon: 73.8412 });
});

test('reads coordinates from query and view', () => {
  assert.deepEqual(
    coordsFromMapsUrl('https://maps.google.com/?q=18.52,73.85'),
    { lat: 18.52, lon: 73.85 }
  );
  assert.deepEqual(
    coordsFromMapsUrl(
      'https://www.google.com/maps/search/?api=1&query=12.97%2C77.59'
    ),
    { lat: 12.97, lon: 77.59 }
  );
  assert.deepEqual(
    coordsFromMapsUrl('https://www.google.com/maps/@19.07,72.87,15z'),
    { lat: 19.07, lon: 72.87 }
  );
  assert.equal(coordsFromMapsUrl('https://www.google.com/maps/place/x'), null);
  assert.equal(coordsFromMapsUrl('https://maps.google.com/?q=0,0'), null);
});

test('reads the place name', () => {
  assert.equal(placeNameFromMapsUrl(PLACE), 'Vaishali Restaurant');
  assert.equal(
    placeNameFromMapsUrl('https://www.google.com/maps/place/18.5,73.8/'),
    ''
  );
  assert.equal(placeNameFromMapsUrl('https://maps.google.com/?q=1,2'), '');
});
