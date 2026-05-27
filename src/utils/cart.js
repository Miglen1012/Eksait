function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function getPathValue(source, path) {
  let current = source;

  for (const key of path) {
    if (!isPlainObject(current) || !hasOwn(current, key)) {
      return { exists: false, value: undefined };
    }

    current = current[key];
  }

  return { exists: true, value: current };
}

function isCartItemLike(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.product || value.product_id || value.product_variant_id || value.variant) {
    return true;
  }

  const hasIdentity = hasOwn(value, "id") || hasOwn(value, "name");
  const hasCartData = [
    "quantity",
    "qty",
    "price",
    "unit_price",
    "total",
    "line_total",
  ].some((key) => hasOwn(value, key));

  return hasIdentity && hasCartData;
}

function mapObjectToCartItems(value, allowEmpty = false) {
  if (!isPlainObject(value)) {
    return null;
  }

  const items = Object.values(value);

  if (items.length === 0) {
    return allowEmpty ? [] : null;
  }

  return items.every(isCartItemLike) ? items : null;
}

function normalizeCartCollection(value, allowEmptyObject = false) {
  if (Array.isArray(value)) {
    return { found: true, items: value };
  }

  const mappedItems = mapObjectToCartItems(value, allowEmptyObject);

  if (mappedItems) {
    return { found: true, items: mappedItems };
  }

  if (value === null) {
    return { found: true, items: [] };
  }

  return { found: false, items: [] };
}

export function getCartItemCollection(data) {
  const explicitPaths = [
    ["items"],
    ["cart", "items"],
    ["cart_items"],
    ["data", "items"],
    ["data", "cart", "items"],
    ["data", "cart_items"],
  ];

  for (const path of explicitPaths) {
    const candidate = getPathValue(data, path);

    if (candidate.exists) {
      return normalizeCartCollection(candidate.value, true);
    }
  }

  const fallbackPaths = [["cart"], ["data"], []];

  for (const path of fallbackPaths) {
    const candidate = path.length === 0 ? { exists: true, value: data } : getPathValue(data, path);

    if (candidate.exists) {
      const collection = normalizeCartCollection(candidate.value);

      if (collection.found) {
        return collection;
      }
    }
  }

  return { found: false, items: [] };
}

export function getCartItemsFromResponse(data) {
  return getCartItemCollection(data).items;
}

export function responseIncludesCartItems(data) {
  return getCartItemCollection(data).found;
}

export function getCartItemCount(data) {
  return getCartItemsFromResponse(data).reduce((total, item) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? 1);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}
