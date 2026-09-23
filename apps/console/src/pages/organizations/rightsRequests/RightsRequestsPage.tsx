// Copyright (c) 2025-2026 Probo Inc <hello@probo.com>.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import {
  getRightsRequestStateVariant,
  promisifyMutation,
} from "@probo/helpers";
import { usePageTitle } from "@probo/hooks";
import { dateFormat } from "@probo/i18n";
import {
  ActionDropdown,
  Badge,
  Button,
  Card,
  Dropdown,
  DropdownCheckboxItem,
  DropdownItem,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconMagnifyingGlass,
  IconPlusLarge,
  IconTrashCan,
  Input,
  Option,
  PageHeader,
  Select,
  TabBadge,
  TabItem,
  Tabs,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useConfirm,
} from "@probo/ui";
import type { ComponentProps } from "react";
import { useCallback, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import {
  graphql,
  type PreloadedQuery,
  useMutation,
  usePaginationFragment,
  usePreloadedQuery,
} from "react-relay";
import { useDebounceCallback } from "usehooks-ts";

import type { RightsRequestGraphDeleteMutation } from "#/__generated__/core/RightsRequestGraphDeleteMutation.graphql";
import type { RightsRequestGraphListQuery } from "#/__generated__/core/RightsRequestGraphListQuery.graphql";
import type {
  RightsRequestsPageFragment$data,
  RightsRequestsPageFragment$key,
} from "#/__generated__/core/RightsRequestsPageFragment.graphql";
import type {
  RightsRequestFilter,
  RightsRequestOrderField,
  RightsRequestsPageRefetchQuery,
  RightsRequestState,
  RightsRequestType,
} from "#/__generated__/core/RightsRequestsPageRefetchQuery.graphql";
import { type Order, SortableTable, SortableTh } from "#/components/SortableTable";
import { useOrganizationId } from "#/hooks/useOrganizationId";
import type { NodeOf } from "#/types";

import {
  deleteRightsRequestMutation,
  rightsRequestsQuery,
} from "../../../hooks/graph/RightsRequestGraph";

import { CreateRightsRequestDialog } from "./dialogs/CreateRightsRequestDialog";

interface RightsRequestsPageProps {
  queryRef: PreloadedQuery<RightsRequestGraphListQuery>;
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;

const REQUEST_STATES: RightsRequestState[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "REJECTED",
];

const REQUEST_TYPES: RightsRequestType[] = [
  "ACCESS",
  "DELETION",
  "RECTIFICATION",
  "PORTABILITY",
  "OBJECTION",
  "COMPLAINT",
];

const DEFAULT_ORDER: Order = {
  direction: "DESC",
  field: "CREATED_AT",
};

type DateField = "CREATED" | "DEADLINE";

type RequestsFilter = {
  query: string | null;
  states: RightsRequestState[];
  types: RightsRequestType[];
  dateField: DateField;
  // ISO calendar dates (YYYY-MM-DD) from the date inputs, or null.
  dateFrom: string | null;
  dateTo: string | null;
};

const EMPTY_FILTER: RequestsFilter = {
  query: null,
  states: [],
  types: [],
  dateField: "CREATED",
  dateFrom: null,
  dateTo: null,
};

// The connection deliberately declares `filters: []` so that every
// search/filter/sort variant shares one store record: the create dialog and
// the details page derive the connection id from the key alone.
const rightsRequestsPageFragment = graphql`
    fragment RightsRequestsPageFragment on Organization
    @refetchable(queryName: "RightsRequestsPageRefetchQuery")
    @argumentDefinitions(
        first: { type: "Int", defaultValue: 25 }
        after: { type: "CursorKey" }
        order: {
            type: "RightsRequestOrder"
            defaultValue: { direction: DESC, field: CREATED_AT }
        }
        filter: { type: "RightsRequestFilter", defaultValue: null }
    ) {
        id
        rightsRequests(
            first: $first
            after: $after
            orderBy: $order
            filter: $filter
        ) @connection(key: "RightsRequestsPage_rightsRequests", filters: []) {
            __id
            totalCount
            stateCounts {
                state
                count
            }
            edges {
                node {
                    id
                    requestType
                    requestState
                    dataSubject
                    contact
                    deadline
                    createdAt

                    canDelete: permission(action: "core:rights-request:delete")
                    canUpdate: permission(action: "core:rights-request:update")
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`;

function localDayStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function localDayEnd(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

// Deadlines are calendar dates exposed as midnight UTC, so their bounds are
// sent as UTC days; creation timestamps use the viewer's local day.
function toGraphqlFilter(filter: RequestsFilter): RightsRequestFilter {
  const created = filter.dateField === "CREATED";
  const deadline = filter.dateField === "DEADLINE";
  return {
    query: filter.query,
    states: filter.states.length > 0 ? filter.states : null,
    types: filter.types.length > 0 ? filter.types : null,
    createdAfter: created && filter.dateFrom ? localDayStart(filter.dateFrom) : null,
    createdBefore: created && filter.dateTo ? localDayEnd(filter.dateTo) : null,
    deadlineAfter: deadline && filter.dateFrom ? `${filter.dateFrom}T00:00:00Z` : null,
    deadlineBefore: deadline && filter.dateTo ? `${filter.dateTo}T00:00:00Z` : null,
  };
}

export default function RightsRequestsPage({
  queryRef,
}: RightsRequestsPageProps) {
  const { t } = useTranslation();
  const organizationId = useOrganizationId();

  usePageTitle(t("rightsRequestsPage.title"));

  const organization = usePreloadedQuery<RightsRequestGraphListQuery>(
    rightsRequestsQuery,
    queryRef,
  );

  const pagination = usePaginationFragment<
    RightsRequestsPageRefetchQuery,
    RightsRequestsPageFragment$key
  >(rightsRequestsPageFragment, organization.node);
  const { data, refetch, loadNext, hasNext, isLoadingNext } = pagination;

  const [filter, setFilter] = useState<RequestsFilter>(EMPTY_FILTER);
  const [order, setOrder] = useState<Order>(DEFAULT_ORDER);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [requestedPageIndex, setPageIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  const connectionId = data?.rightsRequests?.__id ?? "";
  const loadedRequests
    = data?.rightsRequests?.edges?.map(edge => edge.node) ?? [];
  const stateCounts = new Map(
    (data?.rightsRequests?.stateCounts ?? []).map(({ state, count }) => [state, count]),
  );

  // Creating or deleting a request updates the edges in the Relay store but
  // not the stored totalCount, so once every page is loaded the row count is
  // the accurate figure.
  const totalCount = hasNext
    ? Math.max(data?.rightsRequests?.totalCount ?? 0, loadedRequests.length)
    : loadedRequests.length;

  // Pages are windows over the edges accumulated in the store: going forward
  // fetches the next cursor page when it is not loaded yet, going back is
  // instant. Any filter, sort or page-size change restarts from page 0. The
  // requested index is clamped so that deleting the last row of the last
  // page steps back instead of showing an empty window.
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1);
  const pageStart = pageIndex * pageSize;
  const requests = loadedRequests.slice(pageStart, pageStart + pageSize);
  const hasPreviousPage = pageIndex > 0;
  const hasNextPage = pageStart + pageSize < loadedRequests.length || hasNext;

  const hasActiveFilter
    = filter.query !== null
      || filter.states.length > 0
      || filter.types.length > 0
      || filter.dateFrom !== null
      || filter.dateTo !== null;

  const hasAnyAction = requests.some(
    ({ canUpdate, canDelete }) => canUpdate || canDelete,
  );

  // Every list reload goes through here: it replaces the store connection
  // with `first` rows from the server under the given filter and order.
  const reload = useCallback(
    (nextFilter: RequestsFilter, nextOrder: Order, first: number) => {
      startTransition(() => {
        refetch(
          {
            first,
            order: {
              direction: nextOrder.direction,
              field: nextOrder.field as RightsRequestOrderField,
            },
            filter: toGraphqlFilter(nextFilter),
          },
          { fetchPolicy: "network-only" },
        );
      });
    },
    [refetch],
  );

  const refetchRequests = (
    nextFilter: RequestsFilter,
    nextOrder: Order = order,
    nextPageSize: number = pageSize,
  ) => {
    setPageIndex(0);
    reload(nextFilter, nextOrder, nextPageSize);
  };

  const debouncedRefetchQuery = useDebounceCallback(
    useCallback(
      (nextFilter: RequestsFilter) => {
        setPageIndex(0);
        reload(nextFilter, order, pageSize);
      },
      [reload, order, pageSize],
    ),
    SEARCH_DEBOUNCE_MS,
  );

  // After a create or delete the store edges are updated by the mutation, but
  // totalCount and stateCounts are not: reload everything up to the current
  // page so the counts and page bounds come back from the server.
  const refreshAfterMutation = () => {
    debouncedRefetchQuery.cancel();
    reload(filter, order, Math.min((pageIndex + 1) * pageSize, 500));
  };

  const updateFilter = (patch: Partial<RequestsFilter>, debounce = false) => {
    const nextFilter = { ...filter, ...patch };
    setFilter(nextFilter);
    if (debounce) {
      debouncedRefetchQuery(nextFilter);
    } else {
      debouncedRefetchQuery.cancel();
      refetchRequests(nextFilter);
    }
  };

  const handleQueryChange = (value: string) => {
    updateFilter({ query: value === "" ? null : value }, true);
  };

  const toggleState = (state: RightsRequestState, checked: boolean) => {
    updateFilter({
      states: checked
        ? [...filter.states, state]
        : filter.states.filter(s => s !== state),
    });
  };

  const toggleType = (type: RightsRequestType, checked: boolean) => {
    updateFilter({
      types: checked
        ? [...filter.types, type]
        : filter.types.filter(v => v !== type),
    });
  };

  const handleClearFilters = () => {
    updateFilter(EMPTY_FILTER);
  };

  const handlePageSizeChange = (value: string) => {
    const nextPageSize = Number(value);
    setPageSize(nextPageSize);
    debouncedRefetchQuery.cancel();
    refetchRequests(filter, order, nextPageSize);
  };

  const handleNextPage = () => {
    const nextStart = (pageIndex + 1) * pageSize;
    if (nextStart + pageSize <= loadedRequests.length || !hasNext) {
      setPageIndex(pageIndex + 1);
      return;
    }
    loadNext(nextStart + pageSize - loadedRequests.length, {
      onComplete: () => setPageIndex(pageIndex + 1),
    });
  };

  const refetchWithOrder: ComponentProps<typeof SortableTable>["refetch"] = ({
    order: nextOrder,
  }) => {
    debouncedRefetchQuery.cancel();
    setOrder(nextOrder);
    refetchRequests(filter, nextOrder);
  };

  // The tab row is a single-choice shortcut over the state dropdown: a tab is
  // active only when it is the sole selected state.
  const selectedStateTab = filter.states.length === 1 ? filter.states[0] : null;
  const allStatesCount = REQUEST_STATES.reduce(
    (sum, state) => sum + (stateCounts.get(state) ?? 0),
    0,
  );

  const stateLabel = (state: RightsRequestState) =>
    t(`rightsRequestsPage.states.${state.toLowerCase()}`);
  const typeLabel = (type: RightsRequestType) =>
    t(`rightsRequestsPage.types.${type.toLowerCase()}`);

  const stateFilterLabel = filter.states.length === 0
    ? t("rightsRequestsPage.filters.allStates")
    : filter.states.map(stateLabel).join(", ");

  const typeFilterLabel = filter.types.length === 0
    ? t("rightsRequestsPage.filters.allTypes")
    : filter.types.map(typeLabel).join(", ");

  const showEmptyState = loadedRequests.length === 0 && !hasActiveFilter;
  const columnCount = hasAnyAction ? 7 : 6;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("rightsRequestsPage.title")}
        description={t("rightsRequestsPage.description")}
      >
        {organization.node.canCreateRightsRequest && (
          <CreateRightsRequestDialog
            organizationId={organizationId}
            connectionId={connectionId}
            onCreated={refreshAfterMutation}
          >
            <Button icon={IconPlusLarge}>
              {t("rightsRequestsPage.actions.add")}
            </Button>
          </CreateRightsRequestDialog>
        )}
      </PageHeader>

      {showEmptyState
        ? (
            <Card padded>
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">
                  {t("rightsRequestsPage.empty.title")}
                </h3>
                <p className="text-txt-tertiary mb-4">
                  {t("rightsRequestsPage.empty.description")}
                </p>
              </div>
            </Card>
          )
        : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  icon={IconMagnifyingGlass}
                  placeholder={t("rightsRequestsPage.filters.searchPlaceholder")}
                  value={filter.query ?? ""}
                  onValueChange={handleQueryChange}
                  aria-label={t("rightsRequestsPage.filters.searchPlaceholder")}
                />
                <Dropdown
                  toggle={(
                    <Button variant="secondary" className="min-w-40 justify-between gap-2">
                      <span className="truncate">{stateFilterLabel}</span>
                      <IconChevronDown size={12} className="shrink-0" />
                    </Button>
                  )}
                >
                  {REQUEST_STATES.map(state => (
                    <DropdownCheckboxItem
                      key={state}
                      checked={filter.states.includes(state)}
                      onCheckedChange={(checked: boolean) => toggleState(state, checked)}
                    >
                      {stateLabel(state)}
                    </DropdownCheckboxItem>
                  ))}
                </Dropdown>
                <Dropdown
                  toggle={(
                    <Button variant="secondary" className="min-w-40 justify-between gap-2">
                      <span className="truncate">{typeFilterLabel}</span>
                      <IconChevronDown size={12} className="shrink-0" />
                    </Button>
                  )}
                >
                  {REQUEST_TYPES.map(type => (
                    <DropdownCheckboxItem
                      key={type}
                      checked={filter.types.includes(type)}
                      onCheckedChange={(checked: boolean) => toggleType(type, checked)}
                    >
                      {typeLabel(type)}
                    </DropdownCheckboxItem>
                  ))}
                </Dropdown>
                <div className="flex items-center gap-2">
                  <Select
                    variant="editor"
                    value={filter.dateField}
                    onValueChange={(value: string) =>
                      updateFilter({ dateField: value as DateField })}
                    aria-label={t("rightsRequestsPage.filters.dateField")}
                  >
                    <Option value="CREATED">{t("rightsRequestsPage.filters.dateCreated")}</Option>
                    <Option value="DEADLINE">{t("rightsRequestsPage.filters.dateDeadline")}</Option>
                  </Select>
                  <Input
                    type="date"
                    value={filter.dateFrom ?? ""}
                    max={filter.dateTo ?? undefined}
                    onValueChange={value => updateFilter({ dateFrom: value || null })}
                    aria-label={t("rightsRequestsPage.filters.dateFrom")}
                  />
                  <span className="text-sm text-txt-tertiary">{t("rightsRequestsPage.filters.dateTo")}</span>
                  <Input
                    type="date"
                    value={filter.dateTo ?? ""}
                    min={filter.dateFrom ?? undefined}
                    onValueChange={value => updateFilter({ dateTo: value || null })}
                    aria-label={t("rightsRequestsPage.filters.dateTo")}
                  />
                </div>
                {hasActiveFilter && (
                  <Button variant="tertiary" onClick={handleClearFilters}>
                    {t("rightsRequestsPage.filters.clear")}
                  </Button>
                )}
              </div>

              <Tabs>
                <TabItem
                  active={selectedStateTab === null && filter.states.length === 0}
                  onClick={() => updateFilter({ states: [] })}
                >
                  {t("rightsRequestsPage.filters.all")}
                  <TabBadge>{allStatesCount}</TabBadge>
                </TabItem>
                {REQUEST_STATES.map(state => (
                  <TabItem
                    key={state}
                    active={selectedStateTab === state}
                    onClick={() => updateFilter({ states: [state] })}
                  >
                    {stateLabel(state)}
                    <TabBadge>{stateCounts.get(state) ?? 0}</TabBadge>
                  </TabItem>
                ))}
              </Tabs>

              <div className={isPending || isLoadingNext ? "opacity-50 pointer-events-none transition-opacity" : ""}>
                <SortableTable
                  refetch={refetchWithOrder}
                  initialOrder={DEFAULT_ORDER}
                >
                  <Thead>
                    <Tr>
                      <SortableTh field="TYPE">{t("rightsRequestsPage.columns.type")}</SortableTh>
                      <SortableTh field="STATE">{t("rightsRequestsPage.columns.state")}</SortableTh>
                      <Th>{t("rightsRequestsPage.columns.dataSubject")}</Th>
                      <Th>{t("rightsRequestsPage.columns.contact")}</Th>
                      {/* Not sortable: deadline is nullable and the shared cursor cannot page past a NULL boundary row. */}
                      <Th>{t("rightsRequestsPage.columns.deadline")}</Th>
                      <SortableTh field="CREATED_AT">{t("rightsRequestsPage.columns.createdAt")}</SortableTh>
                      {hasAnyAction && <Th>{t("rightsRequestsPage.columns.actions")}</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {requests.length === 0
                      ? (
                          <Tr>
                            <Td
                              colSpan={columnCount}
                              className="text-center text-txt-secondary"
                            >
                              {t("rightsRequestsPage.filters.noMatch")}
                            </Td>
                          </Tr>
                        )
                      : (
                          requests.map(request => (
                            <RequestRow
                              key={request.id}
                              request={request}
                              connectionId={connectionId}
                              hasAnyAction={hasAnyAction}
                              onDeleted={refreshAfterMutation}
                            />
                          ))
                        )}
                  </Tbody>
                </SortableTable>
              </div>

              {/* Table renders its own Card, so the pager sits below it like SortableTable's own "show more" row. */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-txt-secondary">
                <span>
                  {t("rightsRequestsPage.pagination.showing", {
                    from: totalCount === 0 ? 0 : pageStart + 1,
                    to: Math.min(pageStart + requests.length, totalCount),
                    total: totalCount,
                  })}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span>{t("rightsRequestsPage.pagination.pageSize")}</span>
                  <Select
                    variant="editor"
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                    aria-label={t("rightsRequestsPage.pagination.pageSize")}
                  >
                    {PAGE_SIZES.map(size => (
                      <Option key={size} value={String(size)}>{size}</Option>
                    ))}
                  </Select>
                  <span>
                    {t("rightsRequestsPage.pagination.page", {
                      page: pageIndex + 1,
                      pages: pageCount,
                    })}
                  </span>
                  <Button
                    variant="tertiary"
                    icon={IconChevronLeft}
                    disabled={!hasPreviousPage || isLoadingNext}
                    onClick={() => setPageIndex(pageIndex - 1)}
                  >
                    {t("rightsRequestsPage.pagination.previous")}
                  </Button>
                  <Button
                    variant="tertiary"
                    icon={IconChevronRight}
                    disabled={!hasNextPage || isLoadingNext}
                    onClick={handleNextPage}
                  >
                    {t("rightsRequestsPage.pagination.next")}
                  </Button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}

function RequestRow({
  request,
  connectionId,
  hasAnyAction,
  onDeleted,
}: {
  request: NodeOf<
    NonNullable<RightsRequestsPageFragment$data["rightsRequests"]>
  >;
  connectionId: string;
  hasAnyAction: boolean;
  onDeleted: () => void;
}) {
  const organizationId = useOrganizationId();
  const { i18n, t } = useTranslation();
  const [deleteRequest] = useMutation<RightsRequestGraphDeleteMutation>(deleteRightsRequestMutation);
  const confirm = useConfirm();

  const handleDelete = () => {
    confirm(
      async () => {
        await promisifyMutation(deleteRequest)({
          variables: {
            input: {
              rightsRequestId: request.id,
            },
            connections: [connectionId],
          },
        });
        onDeleted();
      },
      {
        message: t("rightsRequestsPage.deleteConfirmation"),
      },
    );
  };

  const detailsUrl = `/organizations/${organizationId}/privacy/rights-requests/${request.id}`;

  return (
    <Tr to={detailsUrl}>
      <Td>
        <Badge variant="neutral">
          {t(`rightsRequestsPage.types.${request.requestType.toLowerCase()}`)}
        </Badge>
      </Td>
      <Td>
        <Badge
          variant={getRightsRequestStateVariant(request.requestState)}
        >
          {t(`rightsRequestsPage.states.${request.requestState.toLowerCase()}`)}
        </Badge>
      </Td>
      <Td>{request.dataSubject || "-"}</Td>
      <Td>{request.contact || "-"}</Td>
      <Td>
        {request.deadline
          ? (
              <time dateTime={request.deadline}>
                {dateFormat(i18n.language, request.deadline)}
              </time>
            )
          : (
              <span className="text-txt-tertiary">
                {t("rightsRequestsPage.noDeadline")}
              </span>
            )}
      </Td>
      <Td>
        <time dateTime={request.createdAt}>
          {dateFormat(i18n.language, request.createdAt)}
        </time>
      </Td>
      {hasAnyAction && (
        <Td noLink width={50} className="text-end">
          <ActionDropdown>
            {request.canDelete && (
              <DropdownItem
                icon={IconTrashCan}
                variant="danger"
                onSelect={handleDelete}
              >
                {t("rightsRequestsPage.actions.delete")}
              </DropdownItem>
            )}
          </ActionDropdown>
        </Td>
      )}
    </Tr>
  );
}
