const getPaginationData = (totalItems, page, limit) => {
  const currentPage = parseInt(page, 10) || 1;
  const itemsLimit = parseInt(limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / itemsLimit) || 1;

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    totalItems,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    limit: itemsLimit,
  };
};

export { getPaginationData };
