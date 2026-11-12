describe('Search Query Building & Pagination Boundaries', () => {
  function vulnerableBuildQuery(query?: string) {
    const filter: any = {};
    if (query) {
      // VULNERABLE: Unescaped regex allows regex injection / ReDoS / wildcards
      filter.long_url = { $regex: query, $options: 'i' };
    }
    return filter;
  }

  function fixedBuildQuery(query?: string) {
    const filter: any = {};
    if (query && query.trim()) {
      // FIXED: Special regex characters escaped
      const sanitized = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.long_url = { $regex: sanitized, $options: 'i' };
    }
    return filter;
  }

  function vulnerablePagination(page: number, pageSize: number, total: number) {
    // VULNERABLE: Off-by-one errors
    const skip = page * pageSize; // Bug 1: skips first page
    const totalPages = Math.floor(total / pageSize); // Bug 2: drops remainder page
    return { skip, totalPages };
  }

  function fixedPagination(page: number, pageSize: number, total: number) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const skip = (safePage - 1) * safePageSize;
    const totalPages = Math.ceil(total / safePageSize) || 1;
    return { safePage, safePageSize, skip, totalPages };
  }

  describe('Minimal Failing Example (Vulnerability & Bug Demonstration)', () => {
    it('demonstrates unescaped regex behaves as metacharacters in vulnerable builder', () => {
      const payload = '.*';
      const vulnerable = vulnerableBuildQuery(payload);
      expect(vulnerable.long_url.$regex).toBe('.*'); // Raw regex metacharacter!

      const fixed = fixedBuildQuery(payload);
      expect(fixed.long_url.$regex).toBe('\\.\\*'); // Safely escaped literal!
    });

    it('demonstrates off-by-one bug in vulnerable pagination', () => {
      const total = 25;
      const flawed = vulnerablePagination(1, 10, total);
      expect(flawed.skip).toBe(10); // Page 1 skipped records 0..9!
      expect(flawed.totalPages).toBe(2); // Records 20..24 dropped from totalPages!

      const fixed = fixedPagination(1, 10, total);
      expect(fixed.skip).toBe(0); // Page 1 starts at index 0
      expect(fixed.totalPages).toBe(3); // All 25 items covered across 3 pages
    });
  });

  describe('Pagination Boundary Tests', () => {
    it('handles first page boundary (page 1, pageSize 10)', () => {
      const res = fixedPagination(1, 10, 25);
      expect(res.skip).toBe(0);
      expect(res.safePage).toBe(1);
    });

    it('handles intermediate page (page 2, pageSize 10)', () => {
      const res = fixedPagination(2, 10, 25);
      expect(res.skip).toBe(10);
    });

    it('handles last page boundary with partial remainder (page 3, pageSize 10, total 25)', () => {
      const res = fixedPagination(3, 10, 25);
      expect(res.skip).toBe(20);
      expect(res.totalPages).toBe(3);
    });

    it('handles empty collection (total 0)', () => {
      const res = fixedPagination(1, 20, 0);
      expect(res.skip).toBe(0);
      expect(res.totalPages).toBe(1);
    });

    it('enforces lower bounds against negative or zero page and pageSize', () => {
      const res = fixedPagination(-5, 0, 10);
      expect(res.safePage).toBe(1);
      expect(res.safePageSize).toBe(1);
      expect(res.skip).toBe(0);
    });

    it('enforces upper bound clamp against DoS pageSize (e.g. 50000)', () => {
      const res = fixedPagination(1, 50000, 500);
      expect(res.safePageSize).toBe(100);
    });
  });
});

