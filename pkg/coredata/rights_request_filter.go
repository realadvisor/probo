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
package coredata

import (
	"time"

	"github.com/jackc/pgx/v5"
)

type (
	RightsRequestFilter struct {
		query          *string
		states         []RightsRequestState
		types          []RightsRequestType
		createdAfter   *time.Time
		createdBefore  *time.Time
		deadlineAfter  *time.Time
		deadlineBefore *time.Time
	}
)

func NewRightsRequestFilter() *RightsRequestFilter {
	return &RightsRequestFilter{}
}

func (f *RightsRequestFilter) WithQuery(query *string) *RightsRequestFilter {
	f.query = query
	return f
}

func (f *RightsRequestFilter) Query() *string {
	return f.query
}

func (f *RightsRequestFilter) WithStates(states ...RightsRequestState) *RightsRequestFilter {
	f.states = states
	return f
}

func (f *RightsRequestFilter) States() []RightsRequestState {
	return f.states
}

func (f *RightsRequestFilter) WithTypes(types ...RightsRequestType) *RightsRequestFilter {
	f.types = types
	return f
}

func (f *RightsRequestFilter) Types() []RightsRequestType {
	return f.types
}

// WithCreatedBetween keeps requests created inside [after, before]; either
// bound may be nil.
func (f *RightsRequestFilter) WithCreatedBetween(after, before *time.Time) *RightsRequestFilter {
	f.createdAfter = after
	f.createdBefore = before
	return f
}

// WithDeadlineBetween keeps requests whose deadline (a date) falls inside
// [after, before], compared on the calendar day in UTC; either bound may be nil.
func (f *RightsRequestFilter) WithDeadlineBetween(after, before *time.Time) *RightsRequestFilter {
	f.deadlineAfter = after
	f.deadlineBefore = before
	return f
}

// WithoutStates returns a copy of the filter with the state restriction
// dropped, used to count matches per state.
func (f *RightsRequestFilter) WithoutStates() *RightsRequestFilter {
	clone := *f
	clone.states = nil
	return &clone
}

func (f *RightsRequestFilter) SQLArguments() pgx.StrictNamedArgs {
	var filterQuery *string

	if f.query != nil && *f.query != "" {
		escaped := escapeLikePattern(*f.query)
		filterQuery = &escaped
	}

	// nil slices encode as SQL NULL, which the fragment treats as "no filter".
	var filterStates []string
	for _, state := range f.states {
		filterStates = append(filterStates, state.String())
	}

	var filterTypes []string
	for _, requestType := range f.types {
		filterTypes = append(filterTypes, requestType.String())
	}

	return pgx.StrictNamedArgs{
		"filter_query":           filterQuery,
		"filter_states":          filterStates,
		"filter_types":           filterTypes,
		"filter_created_after":   f.createdAfter,
		"filter_created_before":  f.createdBefore,
		"filter_deadline_after":  f.deadlineAfter,
		"filter_deadline_before": f.deadlineBefore,
	}
}

func (f *RightsRequestFilter) SQLFragment() string {
	return `
(
	CASE
		WHEN @filter_query::text IS NOT NULL AND @filter_query::text <> '' THEN
			(
				data_subject ILIKE '%' || @filter_query || '%' ESCAPE '\'
				OR contact ILIKE '%' || @filter_query || '%' ESCAPE '\'
				OR details ILIKE '%' || @filter_query || '%' ESCAPE '\'
				OR action_taken ILIKE '%' || @filter_query || '%' ESCAPE '\'
			)
		ELSE TRUE
	END
)
AND (
	CASE
		WHEN @filter_states::text[] IS NOT NULL THEN
			request_state::text = ANY(@filter_states::text[])
		ELSE TRUE
	END
)
AND (
	CASE
		WHEN @filter_types::text[] IS NOT NULL THEN
			request_type::text = ANY(@filter_types::text[])
		ELSE TRUE
	END
)
AND (
	CASE
		WHEN @filter_created_after::timestamptz IS NOT NULL THEN
			created_at >= @filter_created_after::timestamptz
		ELSE TRUE
	END
)
AND (
	CASE
		WHEN @filter_created_before::timestamptz IS NOT NULL THEN
			created_at <= @filter_created_before::timestamptz
		ELSE TRUE
	END
)
AND (
	CASE
		WHEN @filter_deadline_after::timestamptz IS NOT NULL THEN
			deadline >= (@filter_deadline_after::timestamptz AT TIME ZONE 'UTC')::date
		ELSE TRUE
	END
)
AND (
	CASE
		WHEN @filter_deadline_before::timestamptz IS NOT NULL THEN
			deadline <= (@filter_deadline_before::timestamptz AT TIME ZONE 'UTC')::date
		ELSE TRUE
	END
)`
}
