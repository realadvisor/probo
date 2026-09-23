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

package console_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.probo.inc/probo/e2e/internal/testutil"
)

func TestRightsRequest_Create(t *testing.T) {
	t.Parallel()
	owner := testutil.NewClient(t, testutil.RoleOwner)

	query := `
		mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
			createRightsRequest(input: $input) {
				rightsRequestEdge {
					node {
						id
						requestType
						requestState
						dataSubject
						contact
						details
						actionTaken
					}
				}
			}
		}
	`

	var result struct {
		CreateRightsRequest struct {
			RightsRequestEdge struct {
				Node struct {
					ID           string `json:"id"`
					RequestType  string `json:"requestType"`
					RequestState string `json:"requestState"`
					DataSubject  string `json:"dataSubject"`
					Contact      string `json:"contact"`
					Details      string `json:"details"`
					ActionTaken  string `json:"actionTaken"`
				} `json:"node"`
			} `json:"rightsRequestEdge"`
		} `json:"createRightsRequest"`
	}

	err := owner.Execute(query, map[string]any{
		"input": map[string]any{
			"organizationId": owner.GetOrganizationID().String(),
			"requestType":    "ACCESS",
			"requestState":   "TODO",
			"dataSubject":    "John Doe",
			"contact":        "john.doe@example.com",
			"details":        "Request access to personal data",
			"actionTaken":    "Initial review completed",
		},
	}, &result)
	require.NoError(t, err)

	rr := result.CreateRightsRequest.RightsRequestEdge.Node
	assert.NotEmpty(t, rr.ID)
	assert.Equal(t, "ACCESS", rr.RequestType)
	assert.Equal(t, "TODO", rr.RequestState)
	assert.Equal(t, "John Doe", rr.DataSubject)
	assert.Equal(t, "john.doe@example.com", rr.Contact)
	assert.Equal(t, "Request access to personal data", rr.Details)
	assert.Equal(t, "Initial review completed", rr.ActionTaken)
}

func TestRightsRequest_Update(t *testing.T) {
	t.Parallel()
	owner := testutil.NewClient(t, testutil.RoleOwner)

	createQuery := `
		mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
			createRightsRequest(input: $input) {
				rightsRequestEdge {
					node {
						id
					}
				}
			}
		}
	`

	var createResult struct {
		CreateRightsRequest struct {
			RightsRequestEdge struct {
				Node struct {
					ID string `json:"id"`
				} `json:"node"`
			} `json:"rightsRequestEdge"`
		} `json:"createRightsRequest"`
	}

	err := owner.Execute(createQuery, map[string]any{
		"input": map[string]any{
			"organizationId": owner.GetOrganizationID().String(),
			"requestType":    "ACCESS",
			"requestState":   "TODO",
			"dataSubject":    "Original Subject",
			"contact":        "original@example.com",
		},
	}, &createResult)
	require.NoError(t, err)

	rrID := createResult.CreateRightsRequest.RightsRequestEdge.Node.ID

	query := `
		mutation UpdateRightsRequest($input: UpdateRightsRequestInput!) {
			updateRightsRequest(input: $input) {
				rightsRequest {
					id
					requestType
					requestState
					dataSubject
					contact
					details
					actionTaken
				}
			}
		}
	`

	var result struct {
		UpdateRightsRequest struct {
			RightsRequest struct {
				ID           string `json:"id"`
				RequestType  string `json:"requestType"`
				RequestState string `json:"requestState"`
				DataSubject  string `json:"dataSubject"`
				Contact      string `json:"contact"`
				Details      string `json:"details"`
				ActionTaken  string `json:"actionTaken"`
			} `json:"rightsRequest"`
		} `json:"updateRightsRequest"`
	}

	err = owner.Execute(query, map[string]any{
		"input": map[string]any{
			"id":           rrID,
			"requestType":  "DELETION",
			"requestState": "IN_PROGRESS",
			"dataSubject":  "Updated Subject",
			"contact":      "updated@example.com",
			"details":      "Updated details",
			"actionTaken":  "Processing deletion request",
		},
	}, &result)
	require.NoError(t, err)

	assert.Equal(t, rrID, result.UpdateRightsRequest.RightsRequest.ID)
	assert.Equal(t, "DELETION", result.UpdateRightsRequest.RightsRequest.RequestType)
	assert.Equal(t, "IN_PROGRESS", result.UpdateRightsRequest.RightsRequest.RequestState)
	assert.Equal(t, "Updated Subject", result.UpdateRightsRequest.RightsRequest.DataSubject)
	assert.Equal(t, "updated@example.com", result.UpdateRightsRequest.RightsRequest.Contact)
	assert.Equal(t, "Updated details", result.UpdateRightsRequest.RightsRequest.Details)
	assert.Equal(t, "Processing deletion request", result.UpdateRightsRequest.RightsRequest.ActionTaken)
}

func TestRightsRequest_Delete(t *testing.T) {
	t.Parallel()
	owner := testutil.NewClient(t, testutil.RoleOwner)

	createQuery := `
		mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
			createRightsRequest(input: $input) {
				rightsRequestEdge {
					node {
						id
					}
				}
			}
		}
	`

	var createResult struct {
		CreateRightsRequest struct {
			RightsRequestEdge struct {
				Node struct {
					ID string `json:"id"`
				} `json:"node"`
			} `json:"rightsRequestEdge"`
		} `json:"createRightsRequest"`
	}

	err := owner.Execute(createQuery, map[string]any{
		"input": map[string]any{
			"organizationId": owner.GetOrganizationID().String(),
			"requestType":    "ACCESS",
			"requestState":   "TODO",
		},
	}, &createResult)
	require.NoError(t, err)

	rrID := createResult.CreateRightsRequest.RightsRequestEdge.Node.ID

	query := `
		mutation DeleteRightsRequest($input: DeleteRightsRequestInput!) {
			deleteRightsRequest(input: $input) {
				deletedRightsRequestId
			}
		}
	`

	var result struct {
		DeleteRightsRequest struct {
			DeletedRightsRequestID string `json:"deletedRightsRequestId"`
		} `json:"deleteRightsRequest"`
	}

	err = owner.Execute(query, map[string]any{
		"input": map[string]any{
			"rightsRequestId": rrID,
		},
	}, &result)
	require.NoError(t, err)
	assert.Equal(t, rrID, result.DeleteRightsRequest.DeletedRightsRequestID)
}

func TestRightsRequest_List(t *testing.T) {
	t.Parallel()
	owner := testutil.NewClient(t, testutil.RoleOwner)

	createQuery := `
		mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
			createRightsRequest(input: $input) {
				rightsRequestEdge {
					node {
						id
					}
				}
			}
		}
	`

	for i := range 3 {
		_, err := owner.Do(createQuery, map[string]any{
			"input": map[string]any{
				"organizationId": owner.GetOrganizationID().String(),
				"requestType":    "ACCESS",
				"requestState":   "TODO",
				"dataSubject":    fmt.Sprintf("Subject %d", i),
			},
		})
		require.NoError(t, err)
	}

	query := `
		query GetRightsRequests($id: ID!) {
			node(id: $id) {
				... on Organization {
					rightsRequests(first: 10) {
						edges {
							node {
								id
								requestType
								requestState
								dataSubject
							}
						}
						totalCount
					}
				}
			}
		}
	`

	var result struct {
		Node struct {
			RightsRequests struct {
				Edges []struct {
					Node struct {
						ID           string `json:"id"`
						RequestType  string `json:"requestType"`
						RequestState string `json:"requestState"`
						DataSubject  string `json:"dataSubject"`
					} `json:"node"`
				} `json:"edges"`
				TotalCount int `json:"totalCount"`
			} `json:"rightsRequests"`
		} `json:"node"`
	}

	err := owner.Execute(query, map[string]any{
		"id": owner.GetOrganizationID().String(),
	}, &result)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, result.Node.RightsRequests.TotalCount, 3)
}

func TestRightsRequest_ListFilter(t *testing.T) {
	t.Parallel()
	owner := testutil.NewClient(t, testutil.RoleOwner)

	createQuery := `
		mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
			createRightsRequest(input: $input) {
				rightsRequestEdge {
					node {
						id
					}
				}
			}
		}
	`

	// A unique marker keeps this test isolated from requests created by
	// parallel tests in the same organization.
	marker := fmt.Sprintf("filter-%d", time.Now().UnixNano())

	fixtures := []struct {
		requestType  string
		requestState string
		dataSubject  string
		contact      string
		deadline     string
	}{
		{"ACCESS", "TODO", "Alice " + marker, "alice@example.com", "2030-01-10T00:00:00Z"},
		{"DELETION", "IN_PROGRESS", "Bob " + marker, "bob@example.com", "2030-02-20T00:00:00Z"},
		{"ACCESS", "DONE", "Carol " + marker, "carol@example.com", "2030-03-30T00:00:00Z"},
	}

	for _, fixture := range fixtures {
		_, err := owner.Do(createQuery, map[string]any{
			"input": map[string]any{
				"organizationId": owner.GetOrganizationID().String(),
				"requestType":    fixture.requestType,
				"requestState":   fixture.requestState,
				"dataSubject":    fixture.dataSubject,
				"contact":        fixture.contact,
				"deadline":       fixture.deadline,
			},
		})
		require.NoError(t, err)
	}

	query := `
		query GetRightsRequests($id: ID!, $filter: RightsRequestFilter) {
			node(id: $id) {
				... on Organization {
					rightsRequests(first: 50, filter: $filter) {
						edges {
							node {
								requestType
								requestState
								dataSubject
							}
						}
						totalCount
						stateCounts {
							state
							count
						}
					}
				}
			}
		}
	`

	type stateCount struct {
		State string `json:"state"`
		Count int    `json:"count"`
	}

	var lastStateCounts []stateCount

	list := func(t *testing.T, filter map[string]any) (int, []string) {
		t.Helper()

		var result struct {
			Node struct {
				RightsRequests struct {
					Edges []struct {
						Node struct {
							DataSubject string `json:"dataSubject"`
						} `json:"node"`
					} `json:"edges"`
					TotalCount  int          `json:"totalCount"`
					StateCounts []stateCount `json:"stateCounts"`
				} `json:"rightsRequests"`
			} `json:"node"`
		}

		err := owner.Execute(query, map[string]any{
			"id":     owner.GetOrganizationID().String(),
			"filter": filter,
		}, &result)
		require.NoError(t, err)

		subjects := make([]string, 0, len(result.Node.RightsRequests.Edges))
		for _, edge := range result.Node.RightsRequests.Edges {
			subjects = append(subjects, edge.Node.DataSubject)
		}

		lastStateCounts = result.Node.RightsRequests.StateCounts

		return result.Node.RightsRequests.TotalCount, subjects
	}

	t.Run("query matches data subject case-insensitively", func(t *testing.T) {
		total, subjects := list(t, map[string]any{"query": "alice " + marker})
		assert.Equal(t, 1, total)
		assert.Equal(t, []string{"Alice " + marker}, subjects)
	})

	t.Run("query matches contact", func(t *testing.T) {
		total, subjects := list(t, map[string]any{"query": "bob@example"})
		assert.Equal(t, 1, total)
		assert.Equal(t, []string{"Bob " + marker}, subjects)
	})

	t.Run("query escapes LIKE wildcards", func(t *testing.T) {
		total, subjects := list(t, map[string]any{"query": "%" + marker})
		assert.Equal(t, 0, total)
		assert.Empty(t, subjects)
	})

	t.Run("states filter", func(t *testing.T) {
		total, subjects := list(t, map[string]any{
			"query":  marker,
			"states": []string{"TODO", "DONE"},
		})
		assert.Equal(t, 2, total)
		assert.ElementsMatch(t, []string{"Alice " + marker, "Carol " + marker}, subjects)
	})

	t.Run("types filter", func(t *testing.T) {
		total, subjects := list(t, map[string]any{
			"query": marker,
			"types": []string{"DELETION"},
		})
		assert.Equal(t, 1, total)
		assert.Equal(t, []string{"Bob " + marker}, subjects)
	})

	t.Run("combined filters", func(t *testing.T) {
		total, subjects := list(t, map[string]any{
			"query":  marker,
			"states": []string{"TODO", "IN_PROGRESS"},
			"types":  []string{"ACCESS"},
		})
		assert.Equal(t, 1, total)
		assert.Equal(t, []string{"Alice " + marker}, subjects)
	})

	t.Run("empty filter returns everything", func(t *testing.T) {
		total, subjects := list(t, map[string]any{"query": marker})
		assert.Equal(t, 3, total)
		assert.Len(t, subjects, 3)
	})

	t.Run("state counts ignore the states restriction", func(t *testing.T) {
		total, _ := list(t, map[string]any{"query": marker, "states": []string{"DONE"}})
		assert.Equal(t, 1, total)
		assert.ElementsMatch(t, []stateCount{
			{"TODO", 1}, {"IN_PROGRESS", 1}, {"DONE", 1}, {"REJECTED", 0},
		}, lastStateCounts)
	})

	t.Run("deadline range is inclusive on UTC days", func(t *testing.T) {
		total, subjects := list(t, map[string]any{
			"query":          marker,
			"deadlineAfter":  "2030-02-20T00:00:00Z",
			"deadlineBefore": "2030-03-30T00:00:00Z",
		})
		assert.Equal(t, 2, total)
		assert.ElementsMatch(t, []string{"Bob " + marker, "Carol " + marker}, subjects)
	})

	t.Run("created range", func(t *testing.T) {
		now := time.Now().UTC()
		total, _ := list(t, map[string]any{
			"query":         marker,
			"createdAfter":  now.Add(-time.Hour).Format(time.RFC3339),
			"createdBefore": now.Add(time.Hour).Format(time.RFC3339),
		})
		assert.Equal(t, 3, total)

		total, subjects := list(t, map[string]any{
			"query":         marker,
			"createdBefore": now.Add(-time.Hour).Format(time.RFC3339),
		})
		assert.Equal(t, 0, total)
		assert.Empty(t, subjects)
	})
}

func TestRightsRequest_TypeAndStateValues(t *testing.T) {
	t.Parallel()
	owner := testutil.NewClient(t, testutil.RoleOwner)

	t.Run("request type values", func(t *testing.T) {
		types := []string{"ACCESS", "DELETION", "PORTABILITY"}

		for _, requestType := range types {
			t.Run(requestType, func(t *testing.T) {
				query := `
					mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
						createRightsRequest(input: $input) {
							rightsRequestEdge {
								node {
									id
									requestType
								}
							}
						}
					}
				`

				var result struct {
					CreateRightsRequest struct {
						RightsRequestEdge struct {
							Node struct {
								ID          string `json:"id"`
								RequestType string `json:"requestType"`
							} `json:"node"`
						} `json:"rightsRequestEdge"`
					} `json:"createRightsRequest"`
				}

				err := owner.Execute(query, map[string]any{
					"input": map[string]any{
						"organizationId": owner.GetOrganizationID().String(),
						"requestType":    requestType,
						"requestState":   "TODO",
					},
				}, &result)
				require.NoError(t, err)
				assert.Equal(t, requestType, result.CreateRightsRequest.RightsRequestEdge.Node.RequestType)
			})
		}
	})

	t.Run("request state values", func(t *testing.T) {
		states := []string{"TODO", "IN_PROGRESS", "DONE"}

		for _, requestState := range states {
			t.Run(requestState, func(t *testing.T) {
				query := `
					mutation CreateRightsRequest($input: CreateRightsRequestInput!) {
						createRightsRequest(input: $input) {
							rightsRequestEdge {
								node {
									id
									requestState
								}
							}
						}
					}
				`

				var result struct {
					CreateRightsRequest struct {
						RightsRequestEdge struct {
							Node struct {
								ID           string `json:"id"`
								RequestState string `json:"requestState"`
							} `json:"node"`
						} `json:"rightsRequestEdge"`
					} `json:"createRightsRequest"`
				}

				err := owner.Execute(query, map[string]any{
					"input": map[string]any{
						"organizationId": owner.GetOrganizationID().String(),
						"requestType":    "ACCESS",
						"requestState":   requestState,
					},
				}, &result)
				require.NoError(t, err)
				assert.Equal(t, requestState, result.CreateRightsRequest.RightsRequestEdge.Node.RequestState)
			})
		}
	})
}
