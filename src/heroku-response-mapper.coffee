module.exports =
  info: (response) ->
    name:         response.name
    url:          response.web_url
    last_release: response.released_at
    maintenance:  response.maintenance
    slug_size:    response.slug_size && "~ #{Math.round(response.slug_size / 1000000)} MB"
    repo_size:    response.repo_size && "~ #{Math.round(response.repo_size / 1000000)} MB"
    region:       response.region && response.region.name
    git_url:      response.git_url
    buildpack:    response.buildpack_provided_description
    stack:        response.build_stack && response.build_stack.name
