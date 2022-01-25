require 'kramdown'
require 'ruby-progressbar'

def supply
  puts 'Please supply a subcommand.'
end

def usage
  puts '''Usage: rfc_util.rb [SUBCOMMAND]

Subcommands:
    html    Transpile all the markdown into HTML. Takes a file or \'all\' for all.'''
end

def transpile(file)
  template_data = File.open('template.html').read
  markdown_data = File.open(file).read
  html_data = Kramdown::Document.new(markdown_data).to_html
  full_title = markdown_data.lines.first.chomp
  title = full_title.split(':')[0]
  subtitle = full_title.split(':')[1]

  template_data = template_data.gsub('<!-- TITLE -->', title)
  template_data = template_data.gsub('<!-- SUBTITLE -->', subtitle)
  template_data = template_data.gsub('<!-- HTML -->', html_data)

  return template_data
end

def get_new_index
  template_entry = '''<a class="dropdown-item" href="{{path newsletter}}">{{title newsletter}}</a>'''
  total = ""

  Dir.entries("../html").each do |file|
    if file == '.' or file == '..'
      next
    end

    current = template_entry
    markdown_file = "../markdown/" + file.gsub(".html", ".md")
    markdown_data = File.open(markdown_file).read

    current = current.gsub('{{path newsletter}}', '/news/html/' + file)
    current = current.gsub('{{title newsletter}}', markdown_data.lines.first)

    total.prepend(current)
  end

  return total
end

if ARGV.length == 0
  supply  

  exit
elsif ARGV[0] == '--help' or ARGV[0] == '-h'
  usage

  exit
elsif ARGV[0] == 'html'
  if ARGV.length == 1
    puts 'Please supply (a) markdown file(s).'
    exit
  end

  progressbar = ProgressBar.create(:total => ARGV.length - 1, :length => 100, :progress_mark => '#', :remainder_mark => '-')

  ARGV.drop(1).each do |file|
    friendly = file.split('/')[-1].gsub('.md', '')

    progressbar.log friendly + '...'

    File.open('../html/' + friendly + '.html', 'w') { |f| f.write transpile(file) }

    progressbar.increment
  end

  puts 'Writting index...'
  File.open("../newsletter-nav.html", "w") { |f| f.write get_new_index }

  exit
end

